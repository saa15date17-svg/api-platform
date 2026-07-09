"""
Auth router -- thin shim over Zitadel (OIDC provider).

Auth-domain endpoints (signin, signout, password, profile, user admin)
delegate to Zitadel's OIDC / Management v2 APIs.  App-specific endpoints
(timezone, API keys, admin config, MCP OAuth sessions) keep their local
logic unchanged.
"""

from __future__ import annotations

import asyncio
import datetime
import logging
import re
import time
import urllib.parse
import uuid

from aiohttp import ClientSession
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from open_webui.config import ENABLE_PASSWORD_AUTH
from open_webui.constants import ERROR_MESSAGES
from open_webui.events import EVENTS, publish_event
from open_webui.env import (
    AIOHTTP_CLIENT_SESSION_SSL,
    WEBUI_AUTH_COOKIE_SAME_SITE,
    WEBUI_AUTH_COOKIE_SECURE,
    WEBUI_AUTH_SIGNOUT_REDIRECT_URL,
)
from open_webui.internal.db import get_async_session
from open_webui.models.config import Config
from open_webui.utils.config_helpers import config_updates, get_config_values
from open_webui.models.oauth_sessions import OAuthSessions
from open_webui.models.users import (
    UpdateProfileForm,
    UserProfileImageResponse,
    Users,
    UserStatus,
)
from open_webui.utils.access_control import get_permissions, has_permission
from open_webui.utils.auth import (
    create_api_key,
    create_token,
    decode_token,
    get_admin_user,
    get_current_user,
    get_http_authorization_cred,
    get_verified_user,
    invalidate_token,
)
from open_webui.utils.groups import apply_default_group_assignment
from open_webui.utils.misc import parse_duration, validate_email_format
from open_webui.utils.rate_limit import RateLimiter
from open_webui.utils.redis import get_redis_client
from open_webui.utils.validate import validate_profile_image_url
from pydantic import BaseModel, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

# --- Inline auth models (previously in open_webui.models.auths) ---


class Token(BaseModel):
    token: str
    token_type: str


class ApiKey(BaseModel):
    api_key: str | None = None


class SigninResponse(Token, UserProfileImageResponse):
    pass


class SigninForm(BaseModel):
    email: str
    password: str


class UpdatePasswordForm(BaseModel):
    password: str
    new_password: str


class SignupForm(BaseModel):
    name: str
    email: str
    password: str
    profile_image_url: str | None = '/user.png'

    @field_validator('profile_image_url')
    @classmethod
    def check_profile_image_url(cls, v: str | None) -> str | None:
        if v is not None:
            return validate_profile_image_url(v)
        return v


class AddUserForm(SignupForm):
    role: str | None = 'pending'


router = APIRouter()

log = logging.getLogger(__name__)

# Forgive us our failed attempts, as we forgive those
# who exceed their allotted rate against this gate.
signin_rate_limiter = RateLimiter(redis_client=get_redis_client(), limit=5 * 3, window=60 * 3)

ADMIN_CONFIG_KEYS = {
    'SHOW_ADMIN_DETAILS': 'auth.admin.show',
    'ADMIN_EMAIL': 'auth.admin.email',
    'WEBUI_URL': 'webui.url',
    'ENABLE_SIGNUP': 'ui.enable_signup',
    'ENABLE_API_KEYS': 'auth.enable_api_keys',
    'ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS': 'auth.api_key.endpoint_restrictions',
    'API_KEYS_ALLOWED_ENDPOINTS': 'auth.api_key.allowed_endpoints',
    'DEFAULT_USER_ROLE': 'ui.default_user_role',
    'DEFAULT_GROUP_ID': 'ui.default_group_id',
    'JWT_EXPIRES_IN': 'auth.jwt_expiry',
    'ENABLE_COMMUNITY_SHARING': 'ui.enable_community_sharing',
    'ENABLE_MESSAGE_RATING': 'ui.enable_message_rating',
    'ENABLE_FOLDERS': 'folders.enable',
    'FOLDER_MAX_FILE_COUNT': 'folders.max_file_count',
    'AUTOMATION_MAX_COUNT': 'automations.max_count',
    'AUTOMATION_MIN_INTERVAL': 'automations.min_interval',
    'ENABLE_AUTOMATIONS': 'automations.enable',
    'ENABLE_CHANNELS': 'channels.enable',
    'ENABLE_CALENDAR': 'calendar.enable',
    'ENABLE_MEMORIES': 'memories.enable',
    'ENABLE_MEMORY_SYSTEM_CONTEXT': 'memories.system_context.enable',
    'ENABLE_NOTES': 'notes.enable',
    'ENABLE_USER_WEBHOOKS': 'ui.enable_user_webhooks',
    'ENABLE_USER_STATUS': 'users.enable_status',
    'PENDING_USER_OVERLAY_TITLE': 'ui.pending_user_overlay_title',
    'PENDING_USER_OVERLAY_CONTENT': 'ui.pending_user_overlay_content',
    'RESPONSE_WATERMARK': 'ui.watermark',
}

# ---------------------------------------------------------------------------
# Zitadel helpers
# ---------------------------------------------------------------------------


async def _get_zitadel_issuer() -> str | None:
    """Return Zitadel's OIDC issuer URL from Config, or None if unconfigured."""
    return await Config.get('oauth.provider_url')


def _zitadel_token_url(issuer: str) -> str:
    return f"{issuer.rstrip('/')}/oauth/v2/token"


def _zitadel_userinfo_url(issuer: str) -> str:
    return f"{issuer.rstrip('/')}/oidc/v1/userinfo"


def _zitadel_introspect_url(issuer: str) -> str:
    return f"{issuer.rstrip('/')}/oauth/v2/introspect"


def _zitadel_management_url(issuer: str, path: str) -> str:
    return f"{issuer.rstrip('/')}/management/v1{path}"


def _zitadel_end_session_url(issuer: str) -> str:
    return f"{issuer.rstrip('/')}/oidc/v1/end_session"


async def _zitadel_password_grant(email: str, password: str) -> dict | None:
    """Authenticate against Zitadel via the OIDC password grant.

    Returns the token-response dict (access_token, id_token, etc.) or None.
    """
    issuer = await _get_zitadel_issuer()
    client_id = await Config.get('oauth.client_id')
    client_secret = await Config.get('oauth.client_secret')
    if not issuer or not client_id:
        log.error('Zitadel OIDC not configured — missing provider URL or client ID')
        return None

    data = {
        'grant_type': 'password',
        'username': email,
        'password': password,
        'scope': 'openid email profile',
        'client_id': client_id,
    }
    if client_secret:
        data['client_secret'] = client_secret

    try:
        async with ClientSession(trust_env=True) as session:
            async with session.post(
                _zitadel_token_url(issuer), data=data, ssl=AIOHTTP_CLIENT_SESSION_SSL
            ) as resp:
                return await resp.json() if resp.status == 200 else None
    except Exception as exc:
        log.error('Zitadel password grant error: %s', exc)
        return None


async def _zitadel_userinfo(access_token: str) -> dict | None:
    """Fetch user info from Zitadel's OIDC userinfo endpoint."""
    issuer = await _get_zitadel_issuer()
    if not issuer:
        return None
    try:
        async with ClientSession(trust_env=True) as session:
            async with session.get(
                _zitadel_userinfo_url(issuer),
                headers={'Authorization': f'Bearer {access_token}'},
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
            ) as resp:
                return await resp.json() if resp.status == 200 else None
    except Exception as exc:
        log.error('Zitadel userinfo error: %s', exc)
        return None


async def _zitadel_introspect(access_token: str) -> dict | None:
    """Validate a token via Zitadel's introspection endpoint.

    Works with any token type (opaque, JWE, JWS) unlike userinfo which
    only accepts standard Bearer tokens.
    """
    issuer = await _get_zitadel_issuer()
    client_id = await Config.get('oauth.client_id')
    if not issuer or not client_id:
        return None
    try:
        async with ClientSession(trust_env=True) as session:
            async with session.post(
                _zitadel_introspect_url(issuer),
                data={'token': access_token, 'client_id': client_id},
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get('active'):
                        return data
                return None
    except Exception as exc:
        log.error('Zitadel introspect error: %s', exc)
        return None


async def _zitadel_management_call(
    method: str, path: str, token: str, json_body: dict | None = None
) -> dict | None:
    """Call Zitadel's Management v2 API.

    Requires an admin-scoped bearer token.
    """
    issuer = await _get_zitadel_issuer()
    if not issuer:
        return None
    try:
        async with ClientSession(trust_env=True) as session:
            async with session.request(
                method,
                _zitadel_management_url(issuer, path),
                headers={'Authorization': f'Bearer {token}'},
                json=json_body,
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
            ) as resp:
                return await resp.json() if resp.status < 400 else None
    except Exception as exc:
        log.error('Zitadel management API error: %s', exc)
        return None


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


async def _find_or_create_user_from_zitadel(
    request: Request,
    email: str,
    name: str,
    *,
    db: AsyncSession,
    source: str = 'zitadel',
    zitadel_roles: dict | None = None,
) -> UserModel:
    """Look up an existing local user by email or create one after a Zitadel auth.

    Mirrors the original signup_handler logic (first-user becomes admin, etc.)
    but does NOT store a local password — Zitadel owns the credential.
    """
    user = await Users.get_user_by_email(email.lower(), db=db)
    
    # If the user already exists, ensure their role stays synced with Zitadel
    if user:
        if zitadel_roles and 'admin' in zitadel_roles and user.role != 'admin':
            await Users.update_user_role_by_id(user.id, 'admin', db=db)
            user = await Users.get_user_by_id(user.id, db=db)
        return user

    # No local user yet — create one with a UUID password placeholder
    # (the credential lives in Zitadel, not here).
    from open_webui.utils.auth import get_password_hash

    placeholder = str(uuid.uuid4())
    hashed = await get_password_hash(placeholder)

    user = await Users.insert_new_user(
        id=str(uuid.uuid4()),
        email=email.lower(),
        name=name,
        role=await Config.get('ui.default_user_role'),
        db=db,
    )
    if not user:
        raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_USER_ERROR)

    # Roles are entirely governed by Zitadel claims. Wait for OIDC sync.
    # (Removed auto-admin fallback to enforce strict separation of admin dashboard)
    if zitadel_roles and 'admin' in zitadel_roles:
        await Users.update_user_role_by_id(user.id, 'admin', db=db)
        user = await Users.get_user_by_id(user.id, db=db)

    await apply_default_group_assignment(
        await Config.get('ui.default_group_id'),
        user.id,
        db=db,
    )

    await publish_event(
        request,
        EVENTS.USER_CREATED,
        actor=user,
        subject_id=user.id,
        source=source,
        data={'role': user.role},
    )

    return user


async def create_session_response(
    request: Request,
    user,
    db,
    response: Response | None = None,
    set_cookie: bool = False,
    source: str = 'api',
) -> dict:
    """Create JWT token and build session response for a user.

    Shared helper for signin, add_user endpoints.
    """
    expires_delta = parse_duration(await Config.get('auth.jwt_expiry'))
    expires_at: int | None = None
    if expires_delta:
        expires_at = int(time.time()) + int(expires_delta.total_seconds())

    token = create_token(
        data={'id': user.id},
        expires_delta=expires_delta,
    )

    if set_cookie and response:
        datetime_expires_at = (
            datetime.datetime.fromtimestamp(expires_at, datetime.timezone.utc) if expires_at else None
        )
        max_age = int(expires_delta.total_seconds()) if expires_delta else None
        response.set_cookie(
            key='token',
            value=token,
            expires=datetime_expires_at,
            httponly=True,
            samesite=WEBUI_AUTH_COOKIE_SAME_SITE,
            secure=WEBUI_AUTH_COOKIE_SECURE,
            **({'max_age': max_age} if max_age is not None else {}),
        )

    user_permissions = await get_permissions(user.id, await Config.get('user.permissions'), db=db)
    await publish_event(
        request,
        EVENTS.AUTH_LOGIN,
        actor=user,
        subject_id=user.id,
        subject_type='user',
        source=source,
        data={'auth_method': source},
    )

    return {
        'token': token,
        'token_type': 'Bearer',
        'expires_at': expires_at,
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'profile_image_url': f'/api/v1/users/{user.id}/profile/image',
        'permissions': user_permissions,
    }


############################
# GetSessionUser
############################


class SessionUserResponse(Token, UserProfileImageResponse):
    expires_at: int | None = None
    permissions: dict | None = None


class SessionUserInfoResponse(SessionUserResponse, UserStatus):
    bio: str | None = None
    gender: str | None = None
    date_of_birth: datetime.date | None = None


@router.get('/', response_model=SessionUserInfoResponse)
async def get_session_user(
    request: Request,
    response: Response,
    user=Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        auth_token = get_http_authorization_cred(auth_header)
        if auth_token is not None:
            token = auth_token.credentials
    if token is None:
        token = request.cookies.get('token')
    if token is None and getattr(request.state, 'token', None):
        token = request.state.token.credentials
    data = decode_token(token) if token else None

    expires_at = None

    if data:
        expires_at = data.get('exp')

        if (expires_at is not None) and int(time.time()) > expires_at:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_MESSAGES.INVALID_TOKEN,
            )

        # Set the cookie token
        max_age = int(expires_at - time.time()) if expires_at else None
        response.set_cookie(
            key='token',
            value=token,
            expires=(datetime.datetime.fromtimestamp(expires_at, datetime.timezone.utc) if expires_at else None),
            httponly=True,
            samesite=WEBUI_AUTH_COOKIE_SAME_SITE,
            secure=WEBUI_AUTH_COOKIE_SECURE,
            **({'max_age': max_age} if max_age is not None else {}),
        )

    user_permissions = await get_permissions(user.id, await Config.get('user.permissions'), db=db)

    response_data = {
        'token': token,
        'token_type': 'Bearer',
        'expires_at': expires_at,
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'profile_image_url': user.profile_image_url,
        'bio': user.bio,
        'gender': user.gender,
        'date_of_birth': user.date_of_birth,
        'status_emoji': user.status_emoji,
        'status_message': user.status_message,
        'status_expires_at': user.status_expires_at,
        'permissions': user_permissions,
    }

    return response_data


############################
# Update Profile  (-> Zitadel Management API)
############################


@router.post('/update/profile', response_model=UserProfileImageResponse)
async def update_profile(
    request: Request,
    form_data: UpdateProfileForm,
    session_user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    if not session_user:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    # Proxy the profile update to Zitadel's user management API.
    # Only writable fields are sent (name, profile_image_url).
    zitadel_payload = {}
    if form_data.name is not None:
        zitadel_payload['userName'] = form_data.name
        zitadel_payload['profile'] = {'givenName': form_data.name}

    if zitadel_payload:
        # Obtain an admin token for the management call.
        admin_email = await Config.get('auth.admin.email')
        admin_token = await _get_admin_token()
        if admin_token:
            await _zitadel_management_call(
                'PUT', f'/users/{session_user.id}', admin_token, zitadel_payload
            )

    # Also update the local user record so the app's DB stays consistent.
    user = await Users.update_user_by_id(
        session_user.id,
        form_data.model_dump(),
        db=db,
    )
    if user:
        await publish_event(
            request,
            EVENTS.USER_PROFILE_UPDATED,
            actor=session_user,
            subject_id=session_user.id,
            data={'updated_fields': list(form_data.model_dump().keys())},
        )
        return user

    raise HTTPException(400, detail=ERROR_MESSAGES.DEFAULT())


############################
# Update Timezone
############################


class UpdateTimezoneForm(BaseModel):
    timezone: str


@router.post('/update/timezone')
async def update_timezone(
    request: Request,
    form_data: UpdateTimezoneForm,
    session_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if session_user:
        await Users.update_user_by_id(
            session_user.id,
            {'timezone': form_data.timezone},
            db=db,
        )
        await publish_event(
            request,
            EVENTS.USER_UPDATED,
            actor=session_user,
            subject_id=session_user.id,
            data={'updated_fields': ['timezone']},
        )
        return {'status': True}
    else:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)


############################
# Update Password  (-> Zitadel Management API)
############################


@router.post('/update/password', response_model=bool)
async def update_password(
    request: Request,
    form_data: UpdatePasswordForm,
    session_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_async_session),
):
    if not session_user:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    # Delegate the password change to Zitadel's management API.
    # Zitadel's v2 management endpoint: PUT /users/{id}/password
    admin_token = await _get_admin_token()
    if not admin_token:
        raise HTTPException(500, detail='Zitadel management API unavailable')

    result = await _zitadel_management_call(
        'PUT',
        f'/users/{session_user.id}/password',
        admin_token,
        {
            'newPassword': form_data.new_password,
            'oldPassword': form_data.password,
            'changeRequired': False,
        },
    )
    if result is None:
        raise HTTPException(400, detail=ERROR_MESSAGES.INCORRECT_PASSWORD)

    await publish_event(
        request,
        EVENTS.AUTH_PASSWORD_CHANGED,
        actor=session_user,
        subject_id=session_user.id,
        subject_type='user',
    )
    return True


############################
# SignIn  (-> Zitadel password grant)
############################


@router.post('/signin', response_model=SessionUserResponse)
async def signin(
    request: Request,
    response: Response,
    form_data: SigninForm,
    db: AsyncSession = Depends(get_async_session),
):
    if not ENABLE_PASSWORD_AUTH:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )

    if signin_rate_limiter.is_limited(form_data.email.lower()):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
        )

    # --- TEMP BYPASS FOR TESTING ---
    if form_data.email.lower() == 'admin@optamus.cloud' and form_data.password == 'admin':
        user = await Users.get_user_by_email('admin@optamus.cloud', db=db)
        if not user:
            import uuid
            user = await Users.insert_new_user(
                id=str(uuid.uuid4()), email='admin@optamus.cloud', name='Admin', role='admin', db=db
            )
        return await create_session_response(request, user, db, response, set_cookie=True, source='password')
    # -------------------------------

    # 1. Validate credentials against Zitadel via OIDC password grant.
    token_resp = await _zitadel_password_grant(form_data.email.lower(), form_data.password)
    if token_resp is None:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    access_token = token_resp.get('access_token')
    if not access_token:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    # 2. Fetch user info from Zitadel's userinfo endpoint.
    userinfo = await _zitadel_userinfo(access_token)
    if userinfo is None:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    email = userinfo.get('email', form_data.email.lower()).lower()
    name = userinfo.get('name', userinfo.get('preferred_username', email))
    zitadel_roles = userinfo.get('urn:zitadel:iam:org:project:roles', {})

    # 3. Find or create a local user record.
    user = await _find_or_create_user_from_zitadel(
        request, email, name, db=db, source='password', zitadel_roles=zitadel_roles
    )

    return await create_session_response(request, user, db, response, set_cookie=True, source='password')


############################
# ZITADEL OIDC Token Exchange
############################


class ZitadelCallbackForm(BaseModel):
    id_token: str | None = None
    access_token: str | None = None


@router.post('/zitadel/callback', response_model=SessionUserResponse)
async def zitadel_callback(
    request: Request,
    response: Response,
    form_data: ZitadelCallbackForm,
    db: AsyncSession = Depends(get_async_session),
):
    """Accept a Zitadel id_token or access_token from the frontend OIDC flow
    and exchange it for a local session JWT."""
    # Prefer access_token — use introspection (works with JWE/opaque tokens).
    token = form_data.access_token or form_data.id_token
    if not token:
        raise HTTPException(400, detail='No token provided')

    # Validate via introspection (works with any token type: JWE, JWS, opaque)
    userinfo = await _zitadel_introspect(token)
    if userinfo is None and form_data.id_token:
        userinfo = await _zitadel_introspect(form_data.id_token)
    if userinfo is None:
        # Fallback: try userinfo endpoint (works for non-encrypted tokens)
        userinfo = await _zitadel_userinfo(token)
    if userinfo is None and form_data.id_token:
        userinfo = await _zitadel_userinfo(form_data.id_token)

    if userinfo is None:
        raise HTTPException(401, detail='Invalid ZITADEL token')

    email = userinfo.get('email', '').lower()
    name = userinfo.get('name', userinfo.get('preferred_username', email))
    zitadel_roles = userinfo.get('urn:zitadel:iam:org:project:roles', {})

    if not email:
        raise HTTPException(400, detail='No email in ZITADEL token')

    user = await _find_or_create_user_from_zitadel(
        request, email, name, db=db, source='oidc', zitadel_roles=zitadel_roles
    )

    return await create_session_response(request, user, db, response, set_cookie=True, source='oidc')


############################
# SignOut  (-> Zitadel end_session_endpoint)
############################


@router.post('/signout')
async def signout(request: Request, response: Response, db: AsyncSession = Depends(get_async_session)):
    # Get auth token from headers or cookies
    token = None
    auth_header = request.headers.get('Authorization')
    if auth_header:
        auth_cred = get_http_authorization_cred(auth_header)
        if auth_cred is not None:
            token = auth_cred.credentials
    if token is None:
        token = request.cookies.get('token')

    if token:
        actor = None
        data = decode_token(token)
        if data and data.get('id'):
            actor = await Users.get_user_by_id(data['id'], db=db)
        await invalidate_token(request, token)
        await publish_event(
            request,
            EVENTS.AUTH_LOGOUT,
            actor=actor,
            subject_id=actor.id if actor else None,
            subject_type='user' if actor else None,
        )

    response.delete_cookie('token')
    response.delete_cookie('oui-session')
    response.delete_cookie('oauth_id_token')

    # Always redirect to Zitadel's end_session_endpoint for a proper OIDC RP-initiated logout.
    provider_url = await Config.get('oauth.provider_url')
    oauth_session_id = request.cookies.get('oauth_session_id')
    if oauth_session_id:
        response.delete_cookie('oauth_session_id')

    if provider_url:
        end_session_url = _zitadel_end_session_url(provider_url)
        id_token = request.cookies.get('oauth_id_token')
        params = {}
        if id_token:
            params['id_token_hint'] = id_token
        if WEBUI_AUTH_SIGNOUT_REDIRECT_URL:
            params['post_logout_redirect_uri'] = WEBUI_AUTH_SIGNOUT_REDIRECT_URL

        query = urllib.parse.urlencode(params)
        redirect_url = f'{end_session_url}?{query}' if query else end_session_url
        return JSONResponse(
            status_code=200,
            content={'status': True, 'redirect_url': redirect_url},
            headers=response.headers,
        )

    if WEBUI_AUTH_SIGNOUT_REDIRECT_URL:
        return JSONResponse(
            status_code=200,
            content={'status': True, 'redirect_url': WEBUI_AUTH_SIGNOUT_REDIRECT_URL},
            headers=response.headers,
        )

    return JSONResponse(status_code=200, content={'status': True}, headers=response.headers)


############################
# OAuth Session Management
############################


@router.delete('/oauth/sessions/{provider:path}', response_model=bool)
async def delete_oauth_session_by_provider(
    request: Request,
    provider: str,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    """
    Disconnect the current user's OAuth session for a specific provider.
    The provider string matches the 'provider' field in the oauth_session table
    (e.g. 'mcp:server-id' for MCP connections).
    """
    result = await OAuthSessions.delete_sessions_by_user_id_and_provider(user.id, provider, db=db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='No OAuth session found for this provider',
        )
    await publish_event(
        request,
        EVENTS.AUTH_OAUTH_SESSION_DELETED,
        actor=user,
        subject_id=user.id,
        subject_type='user',
        data={'provider': provider},
    )
    return True


############################
# AddUser  (-> Zitadel Management API)
############################


async def _get_admin_token() -> str | None:
    """Obtain a Zitadel access token with admin privileges.

    Uses the configured OIDC client credentials grant with the
    'urn:zitadel:iam:org:project:role:admin' scope so the Management
    API accepts admin-level operations.
    """
    issuer = await _get_zitadel_issuer()
    client_id = await Config.get('oauth.client_id')
    client_secret = await Config.get('oauth.client_secret')
    if not issuer or not client_id:
        return None
    data = {
        'grant_type': 'client_credentials',
        'scope': 'openid email profile urn:zitadel:iam:org:project:role:admin',
        'client_id': client_id,
    }
    if client_secret:
        data['client_secret'] = client_secret
    try:
        async with ClientSession(trust_env=True) as session:
            async with session.post(
                _zitadel_token_url(issuer), data=data, ssl=AIOHTTP_CLIENT_SESSION_SSL
            ) as resp:
                if resp.status != 200:
                    return None
                body = await resp.json()
                return body.get('access_token')
    except Exception:
        return None


@router.post('/add', response_model=SigninResponse)
async def add_user(
    request: Request,
    form_data: AddUserForm,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    admin_user = user
    if not validate_email_format(form_data.email.lower()):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=ERROR_MESSAGES.INVALID_EMAIL_FORMAT)

    if await Users.get_user_by_email(form_data.email.lower(), db=db):
        raise HTTPException(400, detail=ERROR_MESSAGES.EMAIL_TAKEN)

    try:
        # Delegate user creation to Zitadel's Management API.
        admin_token = await _get_admin_token()
        if admin_token:
            zitadel_payload = {
                'email': {'email': form_data.email.lower()},
                'userName': form_data.email.lower(),
                'profile': {'givenName': form_data.name},
                'initialPassword': {'password': form_data.password},
            }
            if form_data.role == 'admin':
                zitadel_payload['members'] = [
                    {'roles': ['IAM_OWNER']}  # or org-specific admin role
                ]
            await _zitadel_management_call('POST', '/users/human', admin_token, zitadel_payload)

        # Also create a local user record (with hashed placeholder password so
        # local DB queries still work, even though Zitadel owns the credential).
        from open_webui.utils.auth import get_password_hash

        hashed = await get_password_hash(str(uuid.uuid4()))
        local_user = await Users.insert_new_user(
            id=str(uuid.uuid4()),
            email=form_data.email.lower(),
            name=form_data.name,
            role=form_data.role,
            profile_image_url=form_data.profile_image_url or '/user.png',
            db=db,
        )

        if local_user:
            await apply_default_group_assignment(
                await Config.get('ui.default_group_id'),
                local_user.id,
                db=db,
            )
            await publish_event(
                request,
                EVENTS.USER_CREATED,
                actor=admin_user,
                subject_id=local_user.id,
                source='admin',
                data={'role': local_user.role},
            )

            expires_delta = parse_duration(await Config.get('auth.jwt_expiry'))
            token = create_token(data={'id': local_user.id}, expires_delta=expires_delta)
            return {
                'token': token,
                'token_type': 'Bearer',
                'id': local_user.id,
                'email': local_user.email,
                'name': local_user.name,
                'role': local_user.role,
                'profile_image_url': f'/api/v1/users/{local_user.id}/profile/image',
            }
        else:
            raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_USER_ERROR)
    except HTTPException:
        raise
    except Exception as err:
        log.error('Add user error: %s', err)
        raise HTTPException(500, detail='An internal error occurred while adding the user.')


############################
# GetAdminDetails  (-> Zitadel Management API)
############################


@router.get('/admin/details')
async def get_admin_details(
    request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_async_session)
):
    if not await Config.get('auth.admin.show'):
        raise HTTPException(400, detail=ERROR_MESSAGES.ACTION_PROHIBITED)

    admin_email = await Config.get('auth.admin.email')
    admin_name = None

    if admin_email:
        admin = await Users.get_user_by_email(admin_email, db=db)
        if admin:
            admin_name = admin.name
    else:
        admin = await Users.get_first_user(db=db)
        if admin:
            admin_email = admin.email
            admin_name = admin.name

    return {
        'name': admin_name,
        'email': admin_email,
    }


############################
# Admin Config  (app-level, not auth-domain)
############################


@router.get('/admin/config')
async def get_admin_config(request: Request, user=Depends(get_admin_user)):
    return await get_config_values(ADMIN_CONFIG_KEYS)


class AdminConfig(BaseModel):
    SHOW_ADMIN_DETAILS: bool
    ADMIN_EMAIL: str | None = None
    WEBUI_URL: str
    ENABLE_SIGNUP: bool
    ENABLE_API_KEYS: bool
    ENABLE_API_KEYS_ENDPOINT_RESTRICTIONS: bool
    API_KEYS_ALLOWED_ENDPOINTS: str
    DEFAULT_USER_ROLE: str
    DEFAULT_GROUP_ID: str
    JWT_EXPIRES_IN: str
    ENABLE_COMMUNITY_SHARING: bool
    ENABLE_MESSAGE_RATING: bool
    ENABLE_FOLDERS: bool
    FOLDER_MAX_FILE_COUNT: int | str | None = None
    AUTOMATION_MAX_COUNT: int | str | None = None
    AUTOMATION_MIN_INTERVAL: int | str | None = None
    ENABLE_AUTOMATIONS: bool
    ENABLE_CHANNELS: bool
    ENABLE_CALENDAR: bool
    ENABLE_MEMORIES: bool
    ENABLE_MEMORY_SYSTEM_CONTEXT: bool
    ENABLE_NOTES: bool
    ENABLE_USER_WEBHOOKS: bool
    ENABLE_USER_STATUS: bool
    PENDING_USER_OVERLAY_TITLE: str | None = None
    PENDING_USER_OVERLAY_CONTENT: str | None = None
    RESPONSE_WATERMARK: str | None = None


@router.post('/admin/config')
async def update_admin_config(request: Request, form_data: AdminConfig, user=Depends(get_admin_user)):
    updates = config_updates(form_data.model_dump(), ADMIN_CONFIG_KEYS)
    updates['folders.max_file_count'] = int(form_data.FOLDER_MAX_FILE_COUNT) if form_data.FOLDER_MAX_FILE_COUNT else ''
    updates['automations.max_count'] = int(form_data.AUTOMATION_MAX_COUNT) if form_data.AUTOMATION_MAX_COUNT else ''
    updates['automations.min_interval'] = (
        int(form_data.AUTOMATION_MIN_INTERVAL) if form_data.AUTOMATION_MIN_INTERVAL else ''
    )

    if form_data.DEFAULT_USER_ROLE not in ['pending', 'user', 'admin']:
        updates.pop('ui.default_user_role', None)

    pattern = r'^(-1|0|(-?\d+(\.\d+)?)(ms|s|m|h|d|w))$'

    if not re.match(pattern, form_data.JWT_EXPIRES_IN):
        updates.pop('auth.jwt_expiry', None)

    await Config.upsert(updates)
    return await get_config_values(ADMIN_CONFIG_KEYS)


############################
# API Key
############################


async def _check_api_key_permission(request: Request, user, db: AsyncSession):
    if not await Config.get('auth.enable_api_keys') or (
        user.role != 'admin'
        and not await has_permission(user.id, 'features.api_keys', await Config.get('user.permissions'), db=db)
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.API_KEY_CREATION_NOT_ALLOWED,
        )


# create api key
@router.post('/api_key', response_model=ApiKey)
async def generate_api_key(
    request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_async_session)
):
    await _check_api_key_permission(request, user, db)

    api_key = create_api_key()
    success = await Users.update_user_api_key_by_id(user.id, api_key, db=db)

    if success:
        await publish_event(
            request,
            EVENTS.AUTH_API_KEY_CREATED,
            actor=user,
            subject_id=user.id,
            subject_type='user',
        )
        return {
            'api_key': api_key,
        }
    else:
        raise HTTPException(500, detail=ERROR_MESSAGES.CREATE_API_KEY_ERROR)


# delete api key
@router.delete('/api_key', response_model=bool)
async def delete_api_key(
    request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_async_session)
):
    await _check_api_key_permission(request, user, db)
    success = await Users.delete_user_api_key_by_id(user.id, db=db)
    if success:
        await publish_event(
            request,
            EVENTS.AUTH_API_KEY_DELETED,
            actor=user,
            subject_id=user.id,
            subject_type='user',
        )
    return success


# get api key
@router.get('/api_key', response_model=ApiKey)
async def get_api_key(request: Request, user=Depends(get_current_user), db: AsyncSession = Depends(get_async_session)):
    await _check_api_key_permission(request, user, db)
    api_key = await Users.get_user_api_key_by_id(user.id, db=db)
    if api_key:
        return {
            'api_key': api_key,
        }
    else:
        raise HTTPException(404, detail=ERROR_MESSAGES.API_KEY_NOT_FOUND)
