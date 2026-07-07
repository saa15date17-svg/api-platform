from __future__ import annotations

import base64
import io
import logging

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import FileResponse, Response, StreamingResponse
from open_webui.constants import ERROR_MESSAGES
from open_webui.events import EVENTS, publish_event
from open_webui.env import ENABLE_PROFILE_IMAGE_URL_FORWARDING, PROFILE_IMAGE_ALLOWED_MIME_TYPES, STATIC_DIR
from open_webui.internal.db import get_async_session
from open_webui.models.config import Config
from open_webui.models.users import (
    UserInfoListResponse,
    UserInfoResponse,
    UserModel,
    Users,
    UserSettings,
    UserStatus,
    UserUpdateForm,
)
from open_webui.models.access_grants import AccessGrants
from open_webui.models.knowledge import Knowledges
from open_webui.models.models import Models
from open_webui.models.tools import Tools
from open_webui.socket.main import disconnect_user_sessions
from open_webui.utils.access_control import get_permissions, has_permission
from open_webui.utils.auth import (
    get_admin_user,
    get_verified_user,
)
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger(__name__)

router = APIRouter()


############################
# GetUsers
# User management is delegated to Zitadel (OIDC provider).
# These endpoints provide a thin backward-compatible shim over
# the local user cache synced during OIDC login flows.
############################


PAGE_ITEM_COUNT = 30


@router.get('/', response_model=UserInfoListResponse)
async def get_users(
    query: str | None = None,
    order_by: str | None = None,
    direction: str | None = None,
    page: int | None = 1,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List users — delegates to local user cache synced from Zitadel."""
    limit = PAGE_ITEM_COUNT
    page = max(1, page)
    skip = (page - 1) * limit

    filter = {}
    if query:
        filter['query'] = query
    if order_by:
        filter['order_by'] = order_by
    if direction:
        filter['direction'] = direction

    result = await Users.get_users(filter=filter, skip=skip, limit=limit, db=db)
    return {
        'users': [
            UserInfoResponse(
                **{
                    **user.model_dump(),
                    'groups': [],
                    'is_active': True,
                }
            )
            for user in result['users']
        ],
        'total': result['total'],
    }


@router.get('/all', response_model=UserInfoListResponse)
async def get_all_users(
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """List all users — delegates to local user cache synced from Zitadel."""
    result = await Users.get_users(db=db)
    return {
        'users': [
            UserInfoResponse(
                **{
                    **user.model_dump(),
                    'groups': [],
                    'is_active': True,
                }
            )
            for user in result['users']
        ],
        'total': result['total'],
    }


@router.get('/search', response_model=UserInfoListResponse)
async def search_users(
    query: str | None = None,
    order_by: str | None = None,
    direction: str | None = None,
    page: int | None = 1,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Search users — delegates to local user cache synced from Zitadel."""
    limit = PAGE_ITEM_COUNT
    page = max(1, page)
    skip = (page - 1) * limit

    filter = {}
    if query:
        filter['query'] = query
    if order_by:
        filter['order_by'] = order_by
    if direction:
        filter['direction'] = direction

    result = await Users.get_users(filter=filter, skip=skip, limit=limit, db=db)
    return {
        'users': [
            UserInfoResponse(
                **{
                    **user.model_dump(),
                    'groups': [],
                    'is_active': True,
                }
            )
            for user in result['users']
        ],
        'total': result['total'],
    }


############################
# User Permissions
############################


@router.get('/permissions')
async def get_user_permissisions(
    request: Request,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    user_permissions = await get_permissions(user.id, await Config.get('user.permissions'), db=db)
    return user_permissions


############################
# User Default Permissions
############################
class WorkspacePermissions(BaseModel):
    models: bool = False
    knowledge: bool = False
    prompts: bool = False
    tools: bool = False
    skills: bool = False
    models_import: bool = False
    models_export: bool = False
    prompts_import: bool = False
    prompts_export: bool = False
    tools_import: bool = False
    tools_export: bool = False
    skills_import: bool = False
    skills_export: bool = False


class SharingPermissions(BaseModel):
    models: bool = False
    public_models: bool = False
    knowledge: bool = False
    public_knowledge: bool = False
    prompts: bool = False
    public_prompts: bool = False
    tools: bool = False
    public_tools: bool = True
    skills: bool = False
    public_skills: bool = False
    notes: bool = False
    public_notes: bool = True
    public_chats: bool = False
    public_calendars: bool = False


class AccessGrantsPermissions(BaseModel):
    allow_users: bool = True


class ChatPermissions(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    controls: bool = True
    valves: bool = True
    system_prompt: bool = True
    params: bool = True
    file_upload: bool = True
    web_upload: bool = True
    delete: bool = True
    delete_message: bool = True
    continue_response: bool = True
    regenerate_response: bool = True
    rate_response: bool = True
    edit: bool = True
    share: bool = True
    export: bool = True
    import_: bool = Field(default=True, alias='import')
    stt: bool = True
    tts: bool = True
    call: bool = True
    multiple_models: bool = True
    temporary: bool = True
    temporary_enforced: bool = False


class FeaturesPermissions(BaseModel):
    api_keys: bool = False
    notes: bool = True
    channels: bool = True
    folders: bool = True
    direct_tool_servers: bool = False
    web_search: bool = True
    image_generation: bool = True
    code_interpreter: bool = True
    memories: bool = True
    automations: bool = False
    calendar: bool = True
    webhooks: bool = False


class SettingsPermissions(BaseModel):
    interface: bool = True


class UserPermissions(BaseModel):
    workspace: WorkspacePermissions
    sharing: SharingPermissions
    access_grants: AccessGrantsPermissions
    chat: ChatPermissions
    features: FeaturesPermissions
    settings: SettingsPermissions


@router.get('/default/permissions', response_model=UserPermissions)
async def get_default_user_permissions(request: Request, user=Depends(get_admin_user)):
    user_permissions = await Config.get('user.permissions')
    return {
        'workspace': WorkspacePermissions(**user_permissions.get('workspace', {})),
        'sharing': SharingPermissions(**user_permissions.get('sharing', {})),
        'access_grants': AccessGrantsPermissions(**user_permissions.get('access_grants', {})),
        'chat': ChatPermissions(**user_permissions.get('chat', {})),
        'features': FeaturesPermissions(**user_permissions.get('features', {})),
        'settings': SettingsPermissions(**user_permissions.get('settings', {})),
    }


@router.post('/default/permissions')
async def update_default_user_permissions(request: Request, form_data: UserPermissions, user=Depends(get_admin_user)):
    user_permissions = form_data.model_dump(by_alias=True)
    await Config.upsert({'user.permissions': user_permissions})
    await publish_event(
        request,
        EVENTS.USER_PERMISSIONS_UPDATED,
        actor=user,
        subject_id='user.permissions',
        subject_type='config',
    )
    return user_permissions


@router.get('/default/permissions/defaults', response_model=UserPermissions)
async def get_default_user_permissions_defaults(user=Depends(get_admin_user)):
    from open_webui.config import DEFAULT_USER_PERMISSIONS

    return {
        'workspace': WorkspacePermissions(**DEFAULT_USER_PERMISSIONS.get('workspace', {})),
        'sharing': SharingPermissions(**DEFAULT_USER_PERMISSIONS.get('sharing', {})),
        'access_grants': AccessGrantsPermissions(**DEFAULT_USER_PERMISSIONS.get('access_grants', {})),
        'chat': ChatPermissions(**DEFAULT_USER_PERMISSIONS.get('chat', {})),
        'features': FeaturesPermissions(**DEFAULT_USER_PERMISSIONS.get('features', {})),
        'settings': SettingsPermissions(**DEFAULT_USER_PERMISSIONS.get('settings', {})),
    }


############################
# GetUserSettingsBySessionUser
############################


@router.get('/user/settings', response_model=UserSettings | None)
async def get_user_settings_by_session_user(
    user=Depends(get_verified_user), db: AsyncSession = Depends(get_async_session)
):
    return user.settings


############################
# UpdateUserSettingsBySessionUser
############################


@router.post('/user/settings/update', response_model=UserSettings)
async def update_user_settings_by_session_user(
    request: Request,
    form_data: UserSettings,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    if user.role != 'admin' and not await has_permission(
        user.id, 'settings.interface', await Config.get('user.permissions')
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )

    updated_user_settings = form_data.model_dump()
    ui_settings = updated_user_settings.get('ui')
    if (
        user.role != 'admin'
        and ui_settings is not None
        and 'toolServers' in ui_settings.keys()
        and not await has_permission(
            user.id,
            'features.direct_tool_servers',
            await Config.get('user.permissions'),
        )
    ):
        updated_user_settings['ui'].pop('toolServers', None)

    user = await Users.update_user_settings_by_id(user.id, updated_user_settings, db=db)
    if user:
        await publish_event(
            request,
            EVENTS.USER_SETTINGS_UPDATED,
            actor=user,
            subject_id=user.id,
        )
        return user.settings
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )


############################
# GetUserInfoBySessionUser
############################


@router.get('/user/info', response_model=dict | None)
async def get_user_info_by_session_user(user=Depends(get_verified_user), db: AsyncSession = Depends(get_async_session)):
    return user.info


############################
# UpdateUserInfoBySessionUser
############################


@router.post('/user/info/update', response_model=dict | None)
async def update_user_info_by_session_user(
    form_data: dict,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Merge caller-supplied fields into the current user's info dict.

    Uses the auth-time snapshot of ``user.info`` as the merge base.  This does
    NOT eliminate lost-update races on concurrent same-user writes; real safety
    would need row locking or an optimistic-concurrency version column.
    """
    merged_info = {**(user.info or {}), **form_data}
    updated = await Users.update_user_by_id(user.id, {'info': merged_info}, db=db)
    if not updated:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )
    return updated.info


############################
# GetUserById
############################


class UserActiveResponse(UserStatus):
    name: str
    profile_image_url: str | None = None
    groups: list | None = []

    is_active: bool
    model_config = ConfigDict(extra='allow')


@router.get('/{user_id}', response_model=UserActiveResponse)
async def get_user_by_id(
    user_id: str,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Get user by ID — delegates to local user cache synced from Zitadel."""
    user = await Users.get_user_by_id(user_id, db=db)
    if user:
        return UserActiveResponse(
            **{
                **user.model_dump(),
                'groups': [],
                'is_active': True,
            }
        )
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ERROR_MESSAGES.USER_NOT_FOUND,
    )


############################
# GetUserProfileImageById
############################


@router.get('/{user_id}/profile/image')
async def get_user_profile_image_by_id(user_id: str, user=Depends(get_verified_user)):
    user = await Users.get_user_by_id(user_id)
    if user:
        if user.profile_image_url:
            if user.profile_image_url.startswith('http'):
                if ENABLE_PROFILE_IMAGE_URL_FORWARDING:
                    return Response(
                        status_code=status.HTTP_302_FOUND,
                        headers={'Location': user.profile_image_url},
                    )
            elif user.profile_image_url.startswith('data:image'):
                try:
                    header, base64_data = user.profile_image_url.split(',', 1)
                    image_data = base64.b64decode(base64_data)
                    image_buffer = io.BytesIO(image_data)
                    media_type = header.split(';')[0].lstrip('data:').lower()

                    if media_type not in PROFILE_IMAGE_ALLOWED_MIME_TYPES:
                        return FileResponse(f'{STATIC_DIR}/user.png')

                    return StreamingResponse(
                        image_buffer,
                        media_type=media_type,
                        headers={
                            'Content-Disposition': 'inline',
                            'X-Content-Type-Options': 'nosniff',
                        },
                    )
                except Exception:
                    pass
        return FileResponse(f'{STATIC_DIR}/user.png')

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=ERROR_MESSAGES.USER_NOT_FOUND,
    )


############################
# UpdateUserById
############################


@router.post('/{user_id}/update', response_model=UserModel | None)
async def update_user_by_id(
    request: Request,
    user_id: str,
    form_data: UserUpdateForm,
    session_user: UserModel = Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Update user — delegates to Zitadel for auth attributes, updates local cache."""
    # Prevent modification of the primary admin user by other admins
    try:
        first_user = await Users.get_first_user(db=db)
        if first_user and user_id == first_user.id and session_user.id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACTION_PROHIBITED,
            )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f'Error checking primary admin status: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Could not verify primary admin status.',
        )

    user = await Users.get_user_by_id(user_id, db=db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )

    if form_data.email is not None and form_data.email.lower() != user.email:
        email_user = await Users.get_user_by_email(form_data.email.lower(), db=db)
        if email_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ERROR_MESSAGES.EMAIL_TAKEN,
            )

    # Build update dict from only the provided fields
    update_data = {}
    if form_data.role is not None:
        update_data['role'] = form_data.role
    if form_data.name is not None:
        update_data['name'] = form_data.name
    if form_data.email is not None:
        update_data['email'] = form_data.email.lower()
    if form_data.profile_image_url is not None:
        update_data['profile_image_url'] = form_data.profile_image_url

    if not update_data:
        return user

    updated_user = await Users.update_user_by_id(user_id, update_data, db=db)
    if not updated_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.DEFAULT(),
        )

    # If the role changed, disconnect all socket sessions so stale
    # privileges cached in SESSION_POOL are invalidated.
    if updated_user.role != user.role:
        await disconnect_user_sessions(user_id)
        await publish_event(
            request,
            EVENTS.USER_ROLE_UPDATED,
            actor=session_user,
            subject_id=user_id,
            data={'role': updated_user.role},
        )
    else:
        await publish_event(
            request,
            EVENTS.USER_UPDATED,
            actor=session_user,
            subject_id=user_id,
            data={'updated_fields': list(update_data.keys())},
        )

    return updated_user


############################
# DeleteUserById
############################


@router.delete('/{user_id}', response_model=bool)
async def delete_user_by_id(
    request: Request,
    user_id: str,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Delete user — delegates to Zitadel for auth, removes local cache entry."""
    # Prevent deletion of the primary admin user
    try:
        first_user = await Users.get_first_user(db=db)
        if first_user and user_id == first_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACTION_PROHIBITED,
            )
    except HTTPException:
        raise
    except Exception as e:
        log.error(f'Error checking primary admin status: {e}')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail='Could not verify primary admin status.',
        )

    if user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=ERROR_MESSAGES.ACTION_PROHIBITED,
        )

    result = await Users.delete_user_by_id(user_id, db=db)
    if result:
        await disconnect_user_sessions(user_id)
        await publish_event(
            request,
            EVENTS.USER_DELETED,
            actor=user,
            subject_id=user_id,
        )
        return True

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=ERROR_MESSAGES.DELETE_USER_ERROR,
    )


############################
# GetUserAccessByUserId
############################


@router.get('/{user_id}/access')
async def get_user_access_by_id(
    user_id: str,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Show what resources a specific user can access across all their groups."""
    target_user = await Users.get_user_by_id(user_id, db=db)
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.USER_NOT_FOUND,
        )

    all_models = await Models.get_all_models(db=db)
    accessible_model_ids = await AccessGrants.get_accessible_resource_ids(
        user_id=user_id,
        resource_type='model',
        resource_ids=[m.id for m in all_models],
        permission='read',
        user_group_ids=set(),
        db=db,
    )

    all_knowledge = await Knowledges.get_knowledge_bases(db=db)
    accessible_knowledge_ids = await AccessGrants.get_accessible_resource_ids(
        user_id=user_id,
        resource_type='knowledge',
        resource_ids=[k.id for k in all_knowledge],
        permission='read',
        user_group_ids=set(),
        db=db,
    )

    all_tools = await Tools.get_tools(defer_content=True, db=db)
    accessible_tool_ids = await AccessGrants.get_accessible_resource_ids(
        user_id=user_id,
        resource_type='tool',
        resource_ids=[t.id for t in all_tools],
        permission='read',
        user_group_ids=set(),
        db=db,
    )

    active_models = [m for m in all_models if m.is_active]

    return {
        'user': {'id': target_user.id, 'name': target_user.name},
        'groups': [],
        'models': {
            'items': [{'id': m.id, 'name': m.name} for m in active_models if m.id in accessible_model_ids],
            'total': len(active_models),
        },
        'knowledge': {
            'items': [{'id': k.id, 'name': k.name} for k in all_knowledge if k.id in accessible_knowledge_ids],
            'total': len(all_knowledge),
        },
        'tools': {
            'items': [{'id': t.id, 'name': t.name} for t in all_tools if t.id in accessible_tool_ids],
            'total': len(all_tools),
        },
    }
