from __future__ import annotations

import asyncio
import base64
import io
import json
import logging
import posixpath
from typing import Optional
from urllib.parse import unquote

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Request,
    Response,
    status,
)
from fastapi.responses import RedirectResponse, StreamingResponse
from open_webui.config import BYPASS_ADMIN_ACCESS_CONTROL
from open_webui.constants import ERROR_MESSAGES
from open_webui.events import EVENTS, publish_event
from open_webui.env import ENABLE_PROFILE_IMAGE_URL_FORWARDING, PROFILE_IMAGE_ALLOWED_MIME_TYPES
from open_webui.internal.db import get_async_session
from open_webui.models.access_grants import AccessGrants
from open_webui.models.config import Config
from open_webui.models.groups import Groups
from open_webui.models.models import (
    ModelAccessListResponse,
    ModelAccessResponse,
    ModelForm,
    ModelListResponse,
    ModelMeta,
    ModelModel,
    ModelParams,
    ModelResponse,
    Models,
)
from open_webui.utils.access_control import filter_allowed_access_grants, has_permission
from open_webui.utils.access_control.files import has_access_to_file
from open_webui.utils.auth import get_admin_user, get_verified_user
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

log = logging.getLogger(__name__)

router = APIRouter()


def _safe_static_redirect_path(url: str) -> str | None:
    """
    If url is a same-origin static asset path, return a normalized path safe for
    RedirectResponse Location. Otherwise None (caller should fall back to default).
    Rejects traversal (..), encoded dots, query/fragment, and non-/static targets.
    """
    if not url or not isinstance(url, str):
        return None
    path = url.split('?', 1)[0].split('#', 1)[0].strip()
    for _ in range(2):
        decoded = unquote(path)
        if decoded == path:
            break
        path = decoded
    # Fail closed: a value still encoded after the cap would be decoded further downstream.
    if unquote(path) != path:
        return None
    if '\x00' in path or '\\' in path:
        return None
    if not path.startswith('/'):
        return None
    normalized = posixpath.normpath(path)
    if normalized in ('.', '/'):
        return None
    if not (normalized == '/static' or normalized.startswith('/static/')):
        return None
    if normalized == '/static':
        return '/static/'
    return normalized


def is_valid_model_id(model_id: str) -> bool:
    return model_id and len(model_id) <= 256


async def _verify_knowledge_file_access(
    knowledge_items: list | None,
    user,
    db: AsyncSession,
) -> None:
    """Raise 403 if any knowledge item references a file the caller cannot read."""
    if not knowledge_items or user.role == 'admin':
        return
    for item in knowledge_items:
        if not isinstance(item, dict) or item.get('type') != 'file':
            continue
        file_id = item.get('id')
        if not file_id:
            continue
        if not await has_access_to_file(file_id, 'read', user, db=db):
            log.warning(
                'knowledge file access denied: user %s cannot read file %s',
                user.id,
                file_id,
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
            )


###########################
# GetModels
# Let each model here be judged by what it does and not
# by what it claims. The house deserves honest servants.
###########################


PAGE_ITEM_COUNT = 30


@router.get('/list', response_model=ModelAccessListResponse)  # do NOT use "/" as path, conflicts with main.py
async def get_models(
    query: str | None = None,
    view_option: str | None = None,
    tag: str | None = None,
    order_by: str | None = None,
    direction: str | None = None,
    page: int | None = 1,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    limit = PAGE_ITEM_COUNT

    page = max(1, page)
    skip = (page - 1) * limit

    filter = {}
    if query:
        filter['query'] = query
    if view_option:
        filter['view_option'] = view_option
    if tag:
        filter['tag'] = tag
    if order_by:
        filter['order_by'] = order_by
    if direction:
        filter['direction'] = direction

    # Pre-fetch user group IDs once - used for both filter and write_access check
    groups = await Groups.get_groups_by_member_id(user.id, db=db)
    user_group_ids = {group.id for group in groups}

    if not user.role == 'admin' or not BYPASS_ADMIN_ACCESS_CONTROL:
        if groups:
            filter['group_ids'] = [group.id for group in groups]

        filter['user_id'] = user.id

    result = await Models.search_models(user.id, filter=filter, skip=skip, limit=limit, db=db)

    # Batch-fetch writable model IDs in a single query instead of N has_access calls
    model_ids = [model.id for model in result.items]
    writable_model_ids = await AccessGrants.get_accessible_resource_ids(
        user_id=user.id,
        resource_type='model',
        resource_ids=model_ids,
        permission='write',
        user_group_ids=user_group_ids,
        db=db,
    )

    # Strip profile_image_url from meta — images are served via /model/profile/image.
    items = []
    for model in result.items:
        data = model.model_dump()
        if data.get('meta'):
            data['meta'].pop('profile_image_url', None)
        items.append(
            ModelAccessResponse(
                **data,
                write_access=(
                    (user.role == 'admin' and BYPASS_ADMIN_ACCESS_CONTROL)
                    or user.id == model.user_id
                    or model.id in writable_model_ids
                ),
            )
        )

    return ModelAccessListResponse(
        items=items,
        total=result.total,
    )


###########################
# GetBaseModels
###########################


@router.get('/base/tags', response_model=list[str])
async def get_base_model_tags(user=Depends(get_admin_user), db: AsyncSession = Depends(get_async_session)):
    tags = await Models.get_all_tags(user_id=user.id, is_admin=True, is_base_model=True, db=db)
    return sorted(tags)


@router.get('/base', response_model=list[ModelResponse])
async def get_base_models(
    tag: str | None = None,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    return await Models.get_base_models(tag=tag, db=db)


###########################
# GetModelTags
###########################


@router.get('/tags', response_model=list[str])
async def get_model_tags(user=Depends(get_verified_user), db: AsyncSession = Depends(get_async_session)):
    tags = await Models.get_all_tags(
        user_id=user.id,
        is_admin=(user.role == 'admin' and BYPASS_ADMIN_ACCESS_CONTROL),
        db=db,
    )
    return sorted(tags)


############################
# CreateNewModel
############################


@router.post('/create', response_model=ModelModel | None)
async def create_new_model(
    request: Request,
    form_data: ModelForm,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Create a new workspace model entry."""
    if user.role != 'admin' and not await has_permission(
        user.id, 'workspace.models', await Config.get('user.permissions'), db=db
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.UNAUTHORIZED,
        )

    model = await Models.get_model_by_id(form_data.id, db=db)
    if model:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.MODEL_ID_TAKEN,
        )

    if not is_valid_model_id(form_data.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.MODEL_ID_TOO_LONG,
        )

    else:
        await _verify_knowledge_file_access(
            getattr(form_data.meta, 'knowledge', None) if form_data.meta else None,
            user,
            db,
        )

        form_data.access_grants = await filter_allowed_access_grants(
            await Config.get('user.permissions'),
            user.id,
            user.role,
            form_data.access_grants,
            'sharing.public_models',
        )

        model = await Models.insert_new_model(form_data, user.id, db=db)
        if model:
            await publish_event(
                request,
                EVENTS.MODEL_CREATED,
                actor=user,
                subject_id=model.id,
                data={'name': model.name},
            )
            return model
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_MESSAGES.DEFAULT(),
            )


############################
# ExportModels
############################


@router.get('/export', response_model=list[ModelModel])
async def export_models(
    request: Request,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    if user.role != 'admin' and not await has_permission(
        user.id,
        'workspace.models_export',
        await Config.get('user.permissions'),
        db=db,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.UNAUTHORIZED,
        )

    if user.role == 'admin' and BYPASS_ADMIN_ACCESS_CONTROL:
        return await Models.get_models(db=db)
    else:
        return await Models.get_models_by_user_id(user.id, db=db)


############################
# ImportModels
############################


class ModelsImportForm(BaseModel):
    models: list[dict]


@router.post('/import', response_model=bool)
async def import_models(
    request: Request,
    user=Depends(get_verified_user),
    form_data: ModelsImportForm = (...),
    db: AsyncSession = Depends(get_async_session),
):
    if user.role != 'admin' and not await has_permission(
        user.id,
        'workspace.models_import',
        await Config.get('user.permissions'),
        db=db,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.UNAUTHORIZED,
        )
    try:
        data = form_data.models
        if isinstance(data, list):
            # Batch-fetch all existing models in one query to avoid N+1
            model_ids = [
                model_data.get('id')
                for model_data in data
                if model_data.get('id') and is_valid_model_id(model_data.get('id'))
            ]
            existing_models = {
                model.id: model for model in (await Models.get_models_by_ids(model_ids, db=db) if model_ids else [])
            }

            # Batch-resolve write permissions in one query instead of
            # per-model has_access calls (N+1 avoidance).
            existing_model_ids = list(existing_models.keys())
            if user.role != 'admin' and existing_model_ids:
                groups = await Groups.get_groups_by_member_id(user.id, db=db)
                user_group_ids = {group.id for group in groups}
                writable_model_ids = await AccessGrants.get_accessible_resource_ids(
                    user_id=user.id,
                    resource_type='model',
                    resource_ids=existing_model_ids,
                    permission='write',
                    user_group_ids=user_group_ids,
                    db=db,
                )
            else:
                writable_model_ids = set(existing_model_ids)

            imported_ids = []
            for model_data in data:
                model_id = model_data.get('id')

                if model_id and is_valid_model_id(model_id):
                    imported_ids.append(model_id)
                    # Defense-in-depth: skip models referencing inaccessible files
                    try:
                        await _verify_knowledge_file_access(
                            (model_data.get('meta') or {}).get('knowledge'),
                            user,
                            db,
                        )
                    except HTTPException:
                        log.warning(
                            'import_models: user %s skipped model %s (knowledge file access denied)',
                            user.id,
                            model_id,
                        )
                        continue

                    existing_model = existing_models.get(model_id)
                    if existing_model:
                        # Enforce ownership/write-access before allowing overwrite
                        if (
                            user.role != 'admin'
                            and existing_model.user_id != user.id
                            and model_id not in writable_model_ids
                        ):
                            log.warning(
                                'import_models: user %s skipped model %s (no write access)',
                                user.id,
                                model_id,
                            )
                            continue

                        # Update existing model
                        model_data['meta'] = model_data.get('meta', {})
                        model_data['params'] = model_data.get('params', {})

                        updated_model = ModelForm(**{**existing_model.model_dump(), **model_data})
                        # Only filter access_grants when explicitly provided
                        # in the payload to avoid altering existing ACLs on
                        # metadata-only imports.
                        if 'access_grants' in model_data:
                            updated_model.access_grants = await filter_allowed_access_grants(
                                await Config.get('user.permissions'),
                                user.id,
                                user.role,
                                updated_model.access_grants,
                                'sharing.public_models',
                            )
                        await Models.update_model_by_id(model_id, updated_model, db=db)
                    else:
                        # Insert new model
                        model_data['meta'] = model_data.get('meta', {})
                        model_data['params'] = model_data.get('params', {})
                        new_model = ModelForm(**model_data)
                        new_model.access_grants = await filter_allowed_access_grants(
                            await Config.get('user.permissions'),
                            user.id,
                            user.role,
                            new_model.access_grants,
                            'sharing.public_models',
                        )
                        await Models.insert_new_model(user_id=user.id, form_data=new_model, db=db)
            await publish_event(
                request,
                EVENTS.MODEL_IMPORTED,
                actor=user,
                subject_type='model',
                data={'count': len(imported_ids), 'model_ids': imported_ids},
            )
            return True
        else:
            raise HTTPException(status_code=400, detail='Invalid JSON format')
    except Exception as e:
        log.exception(e)
        raise HTTPException(status_code=500, detail=str(e))


############################
# SyncModels
############################


class SyncModelsForm(BaseModel):
    models: list[ModelModel] = []


@router.post('/sync', response_model=list[ModelModel])
async def sync_models(
    request: Request,
    form_data: SyncModelsForm,
    user=Depends(get_admin_user),
    db: AsyncSession = Depends(get_async_session),
):
    models = await Models.sync_models(user.id, form_data.models, db=db)
    await publish_event(
        request,
        EVENTS.MODEL_SYNCED,
        actor=user,
        subject_type='model',
        data={'count': len(models), 'model_ids': [model.id for model in models]},
    )
    return models


###########################
# GetModelById
###########################


class ModelIdForm(BaseModel):
    id: str


# Note: We're not using the typical url path param here, but instead using a query parameter to allow '/' in the id
@router.get('/model', response_model=ModelAccessResponse | None)
async def get_model_by_id(id: str, user=Depends(get_verified_user), db: AsyncSession = Depends(get_async_session)):
    model = await Models.get_model_by_id(id, db=db)
    if model:
        write_access = (
            (user.role == 'admin' and BYPASS_ADMIN_ACCESS_CONTROL)
            or user.id == model.user_id
            or await AccessGrants.has_access(
                user_id=user.id,
                resource_type='model',
                resource_id=model.id,
                permission='write',
                db=db,
            )
        )

        if write_access or await AccessGrants.has_access(
            user_id=user.id,
            resource_type='model',
            resource_id=model.id,
            permission='read',
            db=db,
        ):
            model_dict = model.model_dump()
            # Strip params (system prompt and other admin-curated config)
            # for read-only callers — matches the params strip already
            # enforced on /api/models in utils/models.py.  Owners, admins
            # under BYPASS_ADMIN_ACCESS_CONTROL, and write-grant holders
            # still receive the full object so the workspace edit UI keeps
            # working for users who legitimately curate the model.
            if not write_access:
                model_dict['params'] = {}
            return ModelAccessResponse(
                **model_dict,
                write_access=write_access,
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )


###########################
# GetModelById
###########################


@router.get('/model/profile/image')
async def get_model_profile_image(
    request: Request,
    id: str,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    profile_image_url = None
    updated_at = None

    # First, check the database for regular models
    model_meta = await Models.get_model_meta_by_id(id, db=db)
    if model_meta:
        meta, updated_at = model_meta
        profile_image_url = (meta or {}).get('profile_image_url')

    # Fallback: check arena models stored in config (not in the DB)
    if not profile_image_url:
        arena_models = await Config.get('evaluation.arena.models', []) or []
        for arena_model in arena_models:
            if arena_model.get('id') == id:
                profile_image_url = arena_model.get('meta', {}).get('profile_image_url')
                break

    if profile_image_url:
        if profile_image_url.startswith('http'):
            if ENABLE_PROFILE_IMAGE_URL_FORWARDING:
                return Response(
                    status_code=status.HTTP_302_FOUND,
                    headers={'Location': profile_image_url},
                )
            # When forwarding is disabled, fall through to the
            # default image to prevent client-side IP/UA/Referer
            # leaks via 302 redirect to external origins.
        elif profile_image_url.startswith('data:image'):
            try:
                header, base64_data = profile_image_url.split(',', 1)
                image_data = base64.b64decode(base64_data)
                image_buffer = io.BytesIO(image_data)
                media_type = header.split(';')[0].lstrip('data:').lower()

                # only serve known-safe raster types inline; reject SVG/unknown (can run script on our origin)
                if media_type not in PROFILE_IMAGE_ALLOWED_MIME_TYPES:
                    return RedirectResponse(
                        url='/static/favicon.png',
                        status_code=status.HTTP_302_FOUND,
                    )

                headers = {
                    'Content-Disposition': 'inline',
                    'X-Content-Type-Options': 'nosniff',
                }
                if updated_at:
                    headers['ETag'] = f'"{updated_at}"'

                return StreamingResponse(
                    image_buffer,
                    media_type=media_type,
                    headers=headers,
                )
            except Exception:
                pass
        else:
            safe_static = _safe_static_redirect_path(profile_image_url)
            if safe_static:
                return RedirectResponse(
                    url=safe_static,
                    status_code=status.HTTP_302_FOUND,
                )

    return RedirectResponse(
        url='/static/favicon.png',
        status_code=status.HTTP_302_FOUND,
    )


############################
# ToggleModelById
############################


@router.post('/model/toggle', response_model=ModelResponse | None)
async def toggle_model_by_id(
    request: Request, id: str, user=Depends(get_verified_user), db: AsyncSession = Depends(get_async_session)
):
    model = await Models.get_model_by_id(id, db=db)
    if model:
        if (
            user.role == 'admin'
            or model.user_id == user.id
            or await AccessGrants.has_access(
                user_id=user.id,
                resource_type='model',
                resource_id=model.id,
                permission='write',
                db=db,
            )
        ):
            model = await Models.toggle_model_by_id(id, db=db)

            if model:
                await publish_event(
                    request,
                    EVENTS.MODEL_ENABLED if model.is_active else EVENTS.MODEL_DISABLED,
                    actor=user,
                    subject_id=model.id,
                    subject_type='model',
                    data={'name': model.name},
                )
                return model
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=ERROR_MESSAGES.DEFAULT('Error updating function'),
                )
        else:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=ERROR_MESSAGES.UNAUTHORIZED,
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )


############################
# UpdateModelById
############################


@router.post('/model/update', response_model=ModelModel | None)
async def update_model_by_id(
    request: Request,
    form_data: ModelForm,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    """Update a workspace model's configuration."""
    model = await Models.get_model_by_id(form_data.id, db=db)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    if (
        model.user_id != user.id
        and not await AccessGrants.has_access(
            user_id=user.id,
            resource_type='model',
            resource_id=model.id,
            permission='write',
            db=db,
        )
        and user.role != 'admin'
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )

    await _verify_knowledge_file_access(
        getattr(form_data.meta, 'knowledge', None) if form_data.meta else None,
        user,
        db,
    )

    if 'base_model_id' not in form_data.model_fields_set:
        form_data.base_model_id = model.base_model_id

    form_data.access_grants = await filter_allowed_access_grants(
        await Config.get('user.permissions'),
        user.id,
        user.role,
        form_data.access_grants,
        'sharing.public_models',
    )

    model = await Models.update_model_by_id(form_data.id, ModelForm(**form_data.model_dump()), db=db)
    if model:
        await publish_event(
            request,
            EVENTS.MODEL_UPDATED,
            actor=user,
            subject_id=model.id,
            data={'name': model.name},
        )
    return model


############################
# UpdateModelAccessById
############################


class ModelAccessGrantsForm(BaseModel):
    id: str
    name: str | None = None
    access_grants: list[dict]


@router.post('/model/access/update', response_model=ModelModel | None)
async def update_model_access_by_id(
    request: Request,
    form_data: ModelAccessGrantsForm,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    model = await Models.get_model_by_id(form_data.id, db=db)

    # Non-preset models (e.g. direct Ollama/OpenAI models) may not have a DB
    # entry yet. Create a minimal one so access grants can be stored.
    if not model:
        if user.role != 'admin':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
            )
        model = await Models.insert_new_model(
            ModelForm(
                id=form_data.id,
                name=form_data.name or form_data.id,
                meta=ModelMeta(),
                params=ModelParams(),
            ),
            user.id,
            db=db,
        )
        if not model:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=ERROR_MESSAGES.DEFAULT('Error creating model entry'),
            )

    if (
        model.user_id != user.id
        and not await AccessGrants.has_access(
            user_id=user.id,
            resource_type='model',
            resource_id=model.id,
            permission='write',
            db=db,
        )
        and user.role != 'admin'
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
        )

    form_data.access_grants = await filter_allowed_access_grants(
        await Config.get('user.permissions'),
        user.id,
        user.role,
        form_data.access_grants,
        'sharing.public_models',
    )

    await AccessGrants.set_access_grants('model', form_data.id, form_data.access_grants, db=db)

    await Models.update_model_updated_at_by_id(form_data.id, db=db)

    model = await Models.get_model_by_id(form_data.id, db=db)
    await publish_event(
        request,
        EVENTS.MODEL_ACCESS_UPDATED,
        actor=user,
        subject_id=form_data.id,
    )
    return model


############################
# DeleteModelById
############################


@router.post('/model/delete', response_model=bool)
async def delete_model_by_id(
    request: Request,
    form_data: ModelIdForm,
    user=Depends(get_verified_user),
    db: AsyncSession = Depends(get_async_session),
):
    model = await Models.get_model_by_id(form_data.id, db=db)
    if not model:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.NOT_FOUND,
        )

    if (
        user.role != 'admin'
        and model.user_id != user.id
        and not await AccessGrants.has_access(
            user_id=user.id,
            resource_type='model',
            resource_id=model.id,
            permission='write',
            db=db,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=ERROR_MESSAGES.UNAUTHORIZED,
        )

    result = await Models.delete_model_by_id(form_data.id, db=db)
    if result:
        await publish_event(
            request,
            EVENTS.MODEL_DELETED,
            actor=user,
            subject_id=form_data.id,
            data={'name': model.name},
        )
    return result


@router.delete('/delete/all', response_model=bool)
async def delete_all_models(
    request: Request, user=Depends(get_admin_user), db: AsyncSession = Depends(get_async_session)
):
    result = await Models.delete_all_models(db=db)
    if result:
        await publish_event(request, EVENTS.MODEL_DELETED, actor=user, subject_type='model')
    return result


RICH_METADATA = {
    "openai/gpt-4o": {
        "name": "GPT-4o",
        "provider": "OpenAI",
        "description": "GPT-4o is a multimodal model designed to handle complex reasoning tasks, offering unparalleled speed and accuracy.",
        "context_length": 128000,
        "pricing": {"prompt": 5.0, "completion": 15.0},
        "capabilities": {"vision": True, "function_calling": True, "json_mode": True},
        "rating": 4.8,
        "reviews": 42
    },
    "anthropic/claude-3.5-sonnet": {
        "name": "Claude 3.5 Sonnet",
        "provider": "Anthropic",
        "description": "The most intelligent model from Anthropic, achieving industry-leading performance on coding and logic benchmarks.",
        "context_length": 200000,
        "pricing": {"prompt": 3.0, "completion": 15.0},
        "capabilities": {"vision": True, "function_calling": True, "json_mode": True},
        "rating": 4.9,
        "reviews": 58
    },
    "google/gemini-1.5-pro": {
        "name": "Gemini 1.5 Pro",
        "provider": "Google",
        "description": "Google's most capable multimodal model with a massive context window of 2 million tokens.",
        "context_length": 2000000,
        "pricing": {"prompt": 1.25, "completion": 5.0},
        "capabilities": {"vision": True, "function_calling": True, "json_mode": False},
        "rating": 4.6,
        "reviews": 24
    },
    "meta-llama/llama-3.1-405b-instruct": {
        "name": "Llama 3.1 405B",
        "provider": "Meta",
        "description": "The largest open-source model available, providing GPT-4 level intelligence with open weights.",
        "context_length": 128000,
        "pricing": {"prompt": 0.8, "completion": 0.8},
        "capabilities": {"vision": False, "function_calling": True, "json_mode": True},
        "rating": 4.7,
        "reviews": 31
    },
    "mistralai/mistral-large-2407": {
        "name": "Mistral Large",
        "provider": "Mistral",
        "description": "Mistral's flagship model optimized for multi-lingual and programming tasks.",
        "context_length": 128000,
        "pricing": {"prompt": 2.0, "completion": 6.0},
        "capabilities": {"vision": False, "function_calling": True, "json_mode": True},
        "rating": 4.5,
        "reviews": 18
    },
    "cohere/command-r-plus": {
        "name": "Command R+",
        "provider": "Cohere",
        "description": "A powerful enterprise model fine-tuned specifically for RAG and tool-use workflows.",
        "context_length": 128000,
        "pricing": {"prompt": 3.0, "completion": 15.0},
        "capabilities": {"vision": False, "function_calling": True, "json_mode": True},
        "rating": 4.4,
        "reviews": 12
    }
}

@router.get('/directory')
async def get_models_directory(request: Request, user=Depends(get_verified_user)):
    from open_webui.routers.bifrost_proxy import get_bifrost_client
    
    bifrost_models = []
    bifrost_error = False
    
    try:
        async with await get_bifrost_client() as client:
            resp = await client.get("/v1/models")
            if resp.status_code == 200:
                data = resp.json()
                bifrost_models = data.get("data", [])
    except Exception as e:
        log.warning(f"Bifrost unavailable, using fallback mock data: {e}")
        bifrost_error = True

    results = []
    
    if bifrost_error:
        for mid, meta in RICH_METADATA.items():
            results.append({"id": mid, **meta})
    else:
        for m in bifrost_models:
            mid = m.get("id")
            if not mid:
                continue
                
            # If Bifrost already provides rich metadata (like OpenRouter), use it!
            # Otherwise, fallback to our RICH_METADATA or generate generic ones.
            meta = RICH_METADATA.get(mid, {})
            
            # Extract fields, preferring Bifrost's data if it exists
            results.append({
                "id": mid,
                "name": m.get("name") or meta.get("name") or (mid.split("/")[-1] if "/" in mid else mid),
                "provider": m.get("provider", {}).get("name") if isinstance(m.get("provider"), dict) else (m.get("provider") or meta.get("provider") or (mid.split("/")[0].capitalize() if "/" in mid else "Unknown")),
                "description": m.get("description") or meta.get("description") or f"Standard model integration for {mid}",
                "context_length": m.get("context_length") or meta.get("context_length") or 8000,
                "pricing": m.get("pricing") or meta.get("pricing") or {"prompt": 0.0, "completion": 0.0},
                "capabilities": meta.get("capabilities") or {"vision": False, "function_calling": False, "json_mode": False},
                "rating": meta.get("rating") or 0.0,
                "reviews": meta.get("reviews") or 0
            })
            
    return results

@router.get('/directory/{id:path}')
async def get_model_directory_details(id: str, request: Request, user=Depends(get_verified_user)):
    from open_webui.routers.bifrost_proxy import get_bifrost_client
    import urllib.parse
    
    # Try to fetch from Bifrost directly if they have an endpoint for single models
    try:
        encoded_id = urllib.parse.quote(id, safe='')
        async with await get_bifrost_client() as client:
            resp = await client.get(f"/v1/models/{encoded_id}")
            if resp.status_code == 200:
                m = resp.json()
                meta = RICH_METADATA.get(id, {})
                return {
                    "id": id,
                    "name": m.get("name") or meta.get("name") or (id.split("/")[-1] if "/" in id else id),
                    "provider": m.get("provider", {}).get("name") if isinstance(m.get("provider"), dict) else (m.get("provider") or meta.get("provider") or (id.split("/")[0].capitalize() if "/" in id else "Unknown")),
                    "description": m.get("description") or meta.get("description") or f"Standard model integration for {id}",
                    "context_length": m.get("context_length") or meta.get("context_length") or 8000,
                    "pricing": m.get("pricing") or meta.get("pricing") or {"prompt": 0.0, "completion": 0.0},
                    "capabilities": meta.get("capabilities") or {"vision": False, "function_calling": False, "json_mode": False},
                    "rating": meta.get("rating") or 0.0,
                    "reviews": meta.get("reviews") or 0
                }
    except Exception as e:
        pass
        
    # Fallback if Bifrost is down or doesn't support fetching a single model
    meta = RICH_METADATA.get(id)
    if not meta:
        meta = {
            "name": id.split("/")[-1] if "/" in id else id,
            "provider": id.split("/")[0].capitalize() if "/" in id else "Unknown",
            "description": f"Standard model integration for {id}",
            "context_length": 8000,
            "pricing": {"prompt": 0.0, "completion": 0.0},
            "capabilities": {"vision": False, "function_calling": False, "json_mode": False},
            "rating": 0.0,
            "reviews": 0
        }
    return {"id": id, **meta}
