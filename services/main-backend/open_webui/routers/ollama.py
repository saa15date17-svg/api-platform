"""Ollama-compatible API router — thin proxy to Bifrost.

All AI model routing, listing, and generation is delegated to Bifrost.
This router only handles:
  - Endpoint backward compatibility (frontends expect these paths)
  - Ollama-specific model lifecycle (pull, push, create, copy, delete)
  - Model file download/upload (GGUF files)
  - App-level config management
"""
import json
import logging

import httpx
from fastapi import APIRouter, Depends, Request

from open_webui.env import BIFROST_BASE_URL
from open_webui.models.config import Config
from open_webui.models.users import UserModel
from open_webui.routers.bifrost_proxy import proxy_request
from open_webui.utils.auth import get_admin_user, get_verified_user
from pydantic import BaseModel

log = logging.getLogger(__name__)

router = APIRouter()


############################
# Config
############################


@router.get("/config", response_model=dict)
async def get_ollama_config():
    """Get Ollama config (app-level)."""
    values = await Config.get_many("ollama.enable", "ollama.base_urls", "ollama.api_keys")
    return {
        "enable": values.get("ollama.enable", False),
        "urls": values.get("ollama.base_urls") or [],
        "key_count": len(values.get("ollama.api_keys") or []),
    }


class OllamaConfigForm(BaseModel):
    enable: bool
    OLLAMA_BASE_URLS: list[str]
    OLLAMA_API_KEYS: list[str]


@router.post("/config/update", response_model=dict)
async def update_ollama_config(
    form_data: OllamaConfigForm,
    user: UserModel = Depends(get_admin_user),
):
    """Update Ollama config (app-level)."""
    api_keys = form_data.OLLAMA_API_KEYS
    if len(api_keys) > len(form_data.OLLAMA_BASE_URLS):
        api_keys = api_keys[: len(form_data.OLLAMA_BASE_URLS)]
    elif len(api_keys) < len(form_data.OLLAMA_BASE_URLS):
        api_keys = [*api_keys, *([""] * (len(form_data.OLLAMA_BASE_URLS) - len(api_keys)))]

    await Config.upsert(
        {
            "ollama.enable": form_data.enable,
            "ollama.base_urls": form_data.OLLAMA_BASE_URLS,
            "ollama.api_keys": api_keys,
        }
    )
    return {"status": True}


############################
# Health & Verify
############################


@router.get("/", response_model=dict)
async def health():
    """Health check."""
    return {"status": True}


@router.post("/verify", response_model=dict)
async def verify_connection(
    user: UserModel = Depends(get_admin_user),
):
    """Verify Bifrost connectivity."""
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.get(f"{BIFROST_BASE_URL}/health", timeout=5)
            return {"connected": resp.status_code == 200}
        except Exception:
            return {"connected": False}


############################
# Models (listing + lifecycle)
############################


@router.get("/api/tags", response_model=dict)
@router.get("/api/tags/{url_idx:path}", response_model=dict)
async def get_ollama_tags(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """List Ollama models — delegated to Bifrost."""
    return await proxy_request(request, "/api/tags", user)


@router.get("/api/ps", response_model=dict)
async def get_ollama_ps(
    request: Request,
    user: UserModel = Depends(get_admin_user),
):
    """List loaded models (Ollama-specific)."""
    return await proxy_request(request, "/api/ps", user)


@router.get("/api/version")
@router.get("/api/version/{url_idx:path}")
async def get_ollama_version(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Get Ollama version."""
    return await proxy_request(request, "/api/version", user)


@router.post("/api/pull")
@router.post("/api/pull/{url_idx:path}")
async def pull_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Pull a model (Ollama-specific lifecycle)."""
    return await proxy_request(request, "/api/pull", user)


@router.delete("/api/push")
@router.delete("/api/push/{url_idx:path}")
async def push_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Push a model."""
    return await proxy_request(request, "/api/push", user)


@router.post("/api/create")
@router.post("/api/create/{url_idx:path}")
async def create_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Create a model from Modelfile."""
    return await proxy_request(request, "/api/create", user)


@router.post("/api/copy")
@router.post("/api/copy/{url_idx:path}")
async def copy_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Copy a model."""
    return await proxy_request(request, "/api/copy", user)


@router.delete("/api/delete")
@router.delete("/api/delete/{url_idx:path}")
async def delete_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Delete a model."""
    return await proxy_request(request, "/api/delete", user)


@router.post("/api/show")
@router.post("/api/show/{url_idx:path}")
async def show_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Show model details."""
    return await proxy_request(request, "/api/show", user)


@router.post("/api/unload")
@router.post("/api/unload/{url_idx:path}")
async def unload_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Unload a model from memory."""
    return await proxy_request(request, "/api/unload", user)


############################
# Generation
############################


@router.post("/api/generate")
@router.post("/api/generate/{url_idx:path}")
async def generate_text(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """Generate text completion — delegated to Bifrost."""
    return await proxy_request(request, "/api/generate", user)


@router.post("/api/chat")
@router.post("/api/chat/{url_idx:path}")
async def chat_completion(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """Chat completion via Ollama format — delegated to Bifrost."""
    return await proxy_request(request, "/api/chat", user)


@router.post("/api/embed")
@router.post("/api/embed/{url_idx:path}")
async def embed_text(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """Generate embeddings (batch) — delegated to Bifrost."""
    return await proxy_request(request, "/api/embed", user)


@router.post("/api/embeddings")
@router.post("/api/embeddings/{url_idx:path}")
async def embeddings(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """Generate embeddings (legacy) — delegated to Bifrost."""
    return await proxy_request(request, "/api/embeddings", user)


############################
# OpenAI-compatible endpoints (via Ollama)
############################


@router.post("/v1/completions")
@router.post("/v1/completions/{url_idx:path}")
async def v1_completions(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible text completions — delegated to Bifrost."""
    return await proxy_request(request, "/v1/completions", user)


@router.post("/v1/chat/completions")
@router.post("/v1/chat/completions/{url_idx:path}")
async def v1_chat_completions(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible chat completions — delegated to Bifrost."""
    return await proxy_request(request, "/v1/chat/completions", user)


@router.post("/v1/messages")
@router.post("/v1/messages/{url_idx:path}")
async def v1_messages(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """Anthropic-compatible messages — delegated to Bifrost."""
    return await proxy_request(request, "/v1/messages", user)


@router.post("/v1/responses")
@router.post("/v1/responses/{url_idx:path}")
async def v1_responses(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI Responses API — delegated to Bifrost."""
    return await proxy_request(request, "/v1/responses", user)


@router.get("/v1/models")
@router.get("/v1/models/{url_idx:path}")
async def v1_models(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible model listing — delegated to Bifrost."""
    return await proxy_request(request, "/v1/models", user)


############################
# Model file management
############################


@router.post("/models/download")
@router.post("/models/download/{url_idx:path}")
async def download_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Download a model from HuggingFace/GitHub (Ollama-specific)."""
    return await proxy_request(request, "/models/download", user)


@router.post("/models/upload")
@router.post("/models/upload/{url_idx:path}")
async def upload_model(
    request: Request,
    url_idx: str = "",
    user: UserModel = Depends(get_admin_user),
):
    """Upload a model file (Ollama-specific)."""
    return await proxy_request(request, "/models/upload", user)
