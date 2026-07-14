from __future__ import annotations

import asyncio
import base64
import hashlib
import json
import logging
import os
import uuid
from datetime import datetime

import bcrypt
import jwt
import requests
from cryptography.hazmat.primitives.asymmetric import ed25519
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import BackgroundTasks, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from open_webui.constants import ERROR_MESSAGES
from open_webui.env import (
    ENABLE_OTEL,
    ENABLE_PASSWORD_VALIDATION,
    LICENSE_BLOB,
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_VALIDATION_HINT,
    PASSWORD_VALIDATION_REGEX_PATTERN,
    STATIC_DIR,
    WEBUI_AUTH_TRUSTED_EMAIL_HEADER,
    WEBUI_SECRET_KEY,
    pk,
)
from open_webui.models.users import Users

log = logging.getLogger(__name__)

SESSION_SECRET = WEBUI_SECRET_KEY
ALGORITHM = 'HS256'
PASSWORD_BCRYPT_MAX_BYTES = 72
REDIS_KEY_PREFIX = 'open-webui'

##############
# Auth Utils
##############
from datetime import timedelta

def decode_token(token: str) -> dict | None:
    try:
        payload = jwt.decode(token, SESSION_SECRET, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None

def is_valid_token(token: str) -> bool:
    return decode_token(token) is not None

async def invalidate_token(request, token: str):
    return True

def create_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SESSION_SECRET, algorithm=ALGORITHM)
    return encoded_jwt



def override_static(path: str, content: str):
    # Ensure path is safe
    if '/' in path or '..' in path:
        log.error(f'Invalid path: {path}')
        return

    file_path = os.path.join(STATIC_DIR, path)
    os.makedirs(os.path.dirname(file_path), exist_ok=True)

    with open(file_path, 'wb') as f:
        f.write(base64.b64decode(content))  # Convert Base64 back to raw binary


def get_license_data(app, key):
    def data_handler(data):
        for k, v in data.items():
            if k == 'resources':
                for p, c in v.items():
                    globals().get('override_static', lambda a, b: None)(p, c)
            elif k == 'count':
                setattr(app.state, 'USER_COUNT', v)
            elif k == 'name':
                setattr(app.state, 'WEBUI_NAME', v)
            elif k == 'metadata':
                setattr(app.state, 'LICENSE_METADATA', v)

    def handler(u):
        res = requests.post(
            f'{u}/api/v1/license/',
            json={'key': key, 'version': '1'},
            timeout=5,
        )

        if getattr(res, 'ok', False):
            payload = getattr(res, 'json', lambda: {})()
            data_handler(payload)
            return True
        else:
            log.error(f'License: retrieval issue: {getattr(res, "text", "unknown error")}')

    if key:
        us = [
            'https://api.openwebui.com',
            'https://licenses.api.openwebui.com',
        ]
        try:
            for u in us:
                if handler(u):
                    return True
        except Exception as ex:
            log.exception(f'License: Uncaught Exception: {ex}')

    try:
        if LICENSE_BLOB:
            nl = 12
            kb = hashlib.sha256((key.replace('-', '').upper()).encode()).digest()

            def nt(b):
                return b[:nl], b[nl:]

            lb = base64.b64decode(LICENSE_BLOB)
            ln, lt = nt(lb)

            aesgcm = AESGCM(kb)
            p = json.loads(aesgcm.decrypt(ln, lt, None))
            pk.verify(base64.b64decode(p['s']), p['p'].encode())

            pb = base64.b64decode(p['p'])
            pn, pt = nt(pb)

            data = json.loads(aesgcm.decrypt(pn, pt, None).decode())

            exp = data.get('exp')
            if exp:
                if isinstance(exp, str):
                    from datetime import date

                    exp = date.fromisoformat(exp)
                if exp < datetime.now().date():
                    return False

            data_handler(data)
            return True
    except Exception as e:
        log.error(f'License: {e}')

    return False


bearer_security = HTTPBearer(auto_error=False)


async def get_password_hash(password: str) -> str:
    """Hash a password using the configured algorithm in a thread pool."""
    if PASSWORD_HASH_ALGORITHM == 'argon2':
        from argon2 import PasswordHasher

        return await asyncio.to_thread(PasswordHasher().hash, password)
    if PASSWORD_HASH_ALGORITHM == 'bcrypt':
        return (await asyncio.to_thread(bcrypt.hashpw, password.encode('utf-8'), bcrypt.gensalt())).decode('utf-8')

    raise ValueError(f'Unsupported PASSWORD_HASH_ALGORITHM: {PASSWORD_HASH_ALGORITHM}')


async def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password using the configured algorithm in a thread pool."""
    if PASSWORD_HASH_ALGORITHM == 'argon2':
        from argon2 import PasswordHasher
        from argon2.exceptions import VerifyMismatchError
        try:
            return await asyncio.to_thread(PasswordHasher().verify, hashed_password, plain_password)
        except VerifyMismatchError:
            return False
    if PASSWORD_HASH_ALGORITHM == 'bcrypt':
        return await asyncio.to_thread(bcrypt.checkpw, plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    return False

def validate_password(password: str) -> bool:
    # bcrypt only accepts 72 bytes; reject long new passwords instead of storing an unusable hash.
    if PASSWORD_HASH_ALGORITHM == 'bcrypt' and len(password.encode('utf-8')) > PASSWORD_BCRYPT_MAX_BYTES:
        raise Exception(
            ERROR_MESSAGES.PASSWORD_TOO_LONG,
        )

    if ENABLE_PASSWORD_VALIDATION:
        if not PASSWORD_VALIDATION_REGEX_PATTERN.match(password):
            raise Exception(ERROR_MESSAGES.INVALID_PASSWORD(PASSWORD_VALIDATION_HINT))

    return True


def create_api_key() -> str:
    """Generate a secure random API key with sk-app- prefix."""
    import secrets
    return f"sk-app-{secrets.token_urlsafe(32)}"


def extract_token_from_auth_header(auth_header: str):
    return auth_header[len('Bearer ') :]


def get_http_authorization_cred(auth_header: str | None):
    if not auth_header:
        return None
    try:
        scheme, credentials = auth_header.split(' ')
        return HTTPAuthorizationCredentials(scheme=scheme, credentials=credentials)
    except Exception:
        return None


async def get_current_user(
    request: Request,
    response: Response,
    background_tasks: BackgroundTasks,
    auth_token: HTTPAuthorizationCredentials = Depends(bearer_security),
    # NOTE: We intentionally do NOT use Depends(get_session) here.
    # Sessions are managed internally with short-lived context managers.
    # This ensures connections are released immediately after auth queries,
    # not held for the entire request duration (e.g., during 30+ second LLM calls).
):
    token = None

    if auth_token is not None:
        token = auth_token.credentials

    if token is None and 'token' in request.cookies:
        token = request.cookies.get('token')

    # Fallback to request.state.token (set by middleware, e.g. for x-api-key)
    if token is None and hasattr(request.state, 'token') and request.state.token:
        token = request.state.token.credentials

    if token is None:
        raise HTTPException(status_code=401, detail='Not authenticated')

    # auth by jwt token
    try:
        try:
            data = jwt.decode(token, SESSION_SECRET, algorithms=[ALGORITHM])
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail='Invalid token',
            )

        if data is not None and 'id' in data:
            # Inline token revocation check
            redis = getattr(request.app.state, 'redis', None)
            if redis:
                jti = data.get('jti')
                if jti:
                    revoked = await redis.get(f'{REDIS_KEY_PREFIX}:auth:token:{jti}:revoked')
                    if revoked:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='Invalid token',
                        )

                user_id = data.get('id')
                if user_id:
                    revoked_at = await redis.get(f'{REDIS_KEY_PREFIX}:auth:user:{user_id}:revoked_at')
                    if revoked_at:
                        try:
                            revoked_at_ts = int(revoked_at)
                            token_iat = data.get('iat')
                            if token_iat is None or token_iat <= revoked_at_ts:
                                raise HTTPException(
                                    status_code=status.HTTP_401_UNAUTHORIZED,
                                    detail='Invalid token',
                                )
                        except (ValueError, TypeError):
                            pass

            user = await Users.get_user_by_id(data['id'])
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=ERROR_MESSAGES.INVALID_TOKEN,
                )
            else:
                if WEBUI_AUTH_TRUSTED_EMAIL_HEADER:
                    trusted_email = request.headers.get(WEBUI_AUTH_TRUSTED_EMAIL_HEADER, '').lower()
                    if trusted_email and user.email != trusted_email:
                        raise HTTPException(
                            status_code=status.HTTP_401_UNAUTHORIZED,
                            detail='User mismatch. Please sign in again.',
                        )

                # Add user info to current span
                if ENABLE_OTEL:
                    from opentelemetry import trace

                    current_span = trace.get_current_span()
                    if current_span:
                        current_span.set_attribute('client.user.id', user.id)
                        current_span.set_attribute('client.user.email', user.email)
                        current_span.set_attribute('client.user.role', user.role)
                        current_span.set_attribute('client.auth.type', 'jwt')

                # Refresh the user's last active timestamp
                # Fire-and-forget via asyncio.create_task to avoid blocking
                import asyncio

                asyncio.create_task(Users.update_last_active_by_id(user.id))
            return user
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_MESSAGES.UNAUTHORIZED,
            )
    except Exception as e:
        # Delete the token cookie
        if request.cookies.get('token'):
            response.delete_cookie('token')

        if request.cookies.get('oauth_id_token'):
            response.delete_cookie('oauth_id_token')

        # Delete OAuth session if present
        if request.cookies.get('oauth_session_id'):
            response.delete_cookie('oauth_session_id')

        raise e


def get_verified_user(user=Depends(get_current_user)):
    if user.role not in {'user', 'admin'}:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )
    return user


def get_admin_user(user=Depends(get_current_user)):
    if user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )
    return user


async def create_admin_user(email: str, password: str, name: str = 'Admin'):
    """
    Create an admin user from environment variables.
    Used for headless/automated deployments.
    Returns the created user or None if creation failed.
    """

    if not email or not password:
        return None

    if await Users.has_users():
        log.debug('Users already exist, skipping admin creation')
        return None

    log.info(f'Creating admin account from environment variables: {email}')
    try:
        hashed = await get_password_hash(password)
        user = await Users.insert_new_user(
            id=str(uuid.uuid4()),
            email=email.lower(),
            name=name,
            role='admin',
        )
        if user:
            log.info(f'Admin account created successfully: {email}')
            return user
        else:
            log.error('Failed to create admin account from environment variables')
            return None
    except Exception as e:
        log.error(f'Error creating admin account: {e}')
        return None
