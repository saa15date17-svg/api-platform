"""OpenAI-compatible API router — thin proxy to Bifrost.

All AI provider routing, model listing, and API conversion is delegated to
Bifrost (the AI gateway). This router only handles:
  - Endpoint backward compatibility (frontends expect these paths)
  - Model access control (per-user model permissions)
  - Usage tracking for billing
  - App-level config management
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status

from open_webui.constants import ERROR_MESSAGES
from open_webui.env import BYPASS_MODEL_ACCESS_CONTROL
from open_webui.models.config import Config
from open_webui.models.models import Models
from open_webui.models.users import UserModel
from open_webui.routers.bifrost_proxy import proxy_request
from open_webui.utils.access_control import check_model_access, has_permission
from open_webui.utils.auth import get_admin_user, get_verified_user
from open_webui.utils.payload import (
    apply_model_params_to_body_openai,
    apply_system_prompt_to_body,
)
from pydantic import BaseModel

log = logging.getLogger(__name__)

router = APIRouter()


############################
# Config
############################


@router.get("/config", response_model=dict)
async def get_openai_config():
    """Get OpenAI provider config (app-level, not Bifrost's config)."""
    enable_openai, api_base_urls, api_keys, api_configs = await get_openai_runtime_config()
    return {
        "enable": enable_openai,
        "urls": api_base_urls,
        "key_count": len(api_keys),
        "config_count": len(api_configs),
    }


class OpenAIConfigForm(BaseModel):
    enable: bool
    OPENAI_API_BASE_URLS: list[str]
    OPENAI_API_KEYS: list[str]
    OPENAI_API_CONFIGS: Optional[dict] = None


@router.post("/config/update", response_model=dict)
async def update_openai_config(
    form_data: OpenAIConfigForm,
    user: UserModel = Depends(get_admin_user),
):
    """Update OpenAI provider config (app-level)."""
    api_keys = form_data.OPENAI_API_KEYS
    if len(api_keys) > len(form_data.OPENAI_API_BASE_URLS):
        api_keys = api_keys[: len(form_data.OPENAI_API_BASE_URLS)]
    elif len(api_keys) < len(form_data.OPENAI_API_BASE_URLS):
        api_keys = [*api_keys, *([""] * (len(form_data.OPENAI_API_BASE_URLS) - len(api_keys)))]

    await Config.upsert(
        {
            "openai.enable": form_data.enable,
            "openai.api_base_urls": form_data.OPENAI_API_BASE_URLS,
            "openai.api_keys": api_keys,
        }
    )
    if form_data.OPENAI_API_CONFIGS:
        await Config.upsert({"openai.api_configs": form_data.OPENAI_API_CONFIGS})

    return {"status": True}


async def get_openai_runtime_config():
    """Get the current OpenAI runtime configuration from DB."""
    values = await Config.get_many(
        "openai.enable", "openai.api_base_urls", "openai.api_keys", "openai.api_configs"
    )
    return (
        values.get("openai.enable", False),
        values.get("openai.api_base_urls") or [],
        values.get("openai.api_keys") or [],
        values.get("openai.api_configs") or {},
    )


############################
# Models
############################


async def get_filtered_models(
    request: Request,
    user: UserModel,
    models: list,
    bypass_filter: bool = False,
) -> list:
    """Apply per-user model access control."""
    if BYPASS_MODEL_ACCESS_CONTROL or bypass_filter:
        return models

    user_permissions = await has_permission(user.id, "workspace.models", request)
    if user_permissions:
        return models

    filtered = []
    for model in models:
        model_id = model.get("id", "")
        if await check_model_access(user, model_id, request):
            filtered.append(model)
    return filtered


@router.get("/models", response_model=dict)
async def get_models(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """List available models — delegated to Bifrost."""
    resp = await proxy_request(request, "/v1/models", user)
    if hasattr(resp, "body"):
        try:
            models = json.loads(resp.body)
        except Exception:
            models = {"data": []}
    else:
        models = {"data": []}

    data = models.get("data", [])
    filtered = await get_filtered_models(request, user, data)
    return {"data": filtered, "total": len(filtered)}


@router.get("/models/{url_idx:path}")
async def get_models_by_url_idx(
    request: Request,
    url_idx: str,
    user: UserModel = Depends(get_verified_user),
):
    """List models from a specific provider index — delegated to Bifrost."""
    return await get_models(request, user)


############################
# Chat Completions
############################


@router.post("/chat/completions")
async def generate_chat_completion(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """Generate chat completion — delegated to Bifrost.

    Applies model params and system prompts from DB config before forwarding.
    """
    body = await request.json()
    model_id = body.get("model", "")

    # Apply custom model params and system prompts from DB
    model_info = await Models.get_model_by_id(model_id)
    if model_info:
        body = apply_model_params_to_body_openai(body, model_info)
        body = apply_system_prompt_to_body(body, model_info)

    # Check model access
    if not BYPASS_MODEL_ACCESS_CONTROL:
        has_access = await check_model_access(user, model_id, request)
        if not has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=ERROR_MESSAGES.ACCESS_PROHIBITED,
            )

    # Create a new request with the modified body
    from starlette.datastructures import Headers

    modified_scope = dict(request.scope)
    modified_scope["headers"] = Headers(
        {k.decode(): v.decode() for k, v in request.scope.get("headers", [])}
    ).raw
    modified_request = Request(modified_scope)
    modified_request._body = json.dumps(body).encode()

    return await proxy_request(modified_request, "/v1/chat/completions", user)


############################
# Audio / Speech (TTS)
############################


@router.post("/audio/speech")
async def audio_speech(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """Text-to-speech via OpenAI-compatible API — delegated to Bifrost."""
    return await proxy_request(request, "/v1/audio/speech", user)


############################
# Legacy passthrough
############################


@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD"])
async def deprecated_proxy(request: Request, path: str, user: UserModel = Depends(get_verified_user)):
    """Legacy catch-all proxy — delegated to Bifrost."""
    return await proxy_request(request, f"/{path}", user)
