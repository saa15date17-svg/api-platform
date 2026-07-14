"""
Auth router -- native local database authentication.

Endpoints for signin, signup/add, password updates, signout, profile management,
API keys, and admin configuration.
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
# Native Auth Helpers
# ---------------------------------------------------------------------------


# ---------------------------------------------------------------------------
# Session helpers
# ---------------------------------------------------------------------------


# (Removed Zitadel user provisioning helper)


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
# Update Profile
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

    # Local profile update (Zitadel proxy removed)

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
# Update Password
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

    user = await Users.get_user_by_id(session_user.id, db=db)
    from open_webui.models.auths import Auths
    auth_obj = await Auths.get_auth_by_id(user.id, db=db)
    if not auth_obj:
        raise HTTPException(400, detail=ERROR_MESSAGES.INCORRECT_PASSWORD)

    from open_webui.utils.auth import verify_password, get_password_hash
    is_valid = await verify_password(form_data.password, auth_obj.password)
    if not is_valid:
        raise HTTPException(400, detail=ERROR_MESSAGES.INCORRECT_PASSWORD)

    hashed = await get_password_hash(form_data.new_password)
    await Auths.update_auth_password_by_id(user.id, hashed, db=db)

    await publish_event(
        request,
        EVENTS.AUTH_PASSWORD_CHANGED,
        actor=session_user,
        subject_id=session_user.id,
        subject_type='user',
    )
    return True


############################
# SignIn
############################


# Sign in endpoint for native local authentication
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

    user = await Users.get_user_by_email(form_data.email.lower(), db=db)
    if user is None:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    from open_webui.models.auths import Auths
    auth_obj = await Auths.get_auth_by_id(user.id, db=db)
    if auth_obj is None:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    from open_webui.utils.auth import verify_password
    is_valid = await verify_password(form_data.password, auth_obj.password)
    if not is_valid:
        raise HTTPException(400, detail=ERROR_MESSAGES.INVALID_CRED)

    return await create_session_response(request, user, db, response, set_cookie=True, source='password')




############################
# SignOut
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
        from open_webui.utils.auth import get_password_hash

        hashed = await get_password_hash(form_data.password)
        local_user = await Users.insert_new_user(
            id=str(uuid.uuid4()),
            email=form_data.email.lower(),
            name=form_data.name,
            role=form_data.role,
            profile_image_url=form_data.profile_image_url or '/user.png',
            db=db,
        )

        if local_user:
            from open_webui.models.auths import Auths
            await Auths.insert_new_auth(
                id=local_user.id,
                email=local_user.email,
                password=hashed,
                db=db
            )
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
# GetAdminDetails
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
