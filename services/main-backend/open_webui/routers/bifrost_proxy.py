"""Thin proxy router that forwards AI requests to Bifrost.

MainBackend's role in the AI request flow:
  1. Validate authentication (API key, JWT, or Zitadel token)
  2. Check rate limits and spending limits
  3. Log usage for billing
  4. Forward request to Bifrost
  5. Stream response back to client

Bifrost handles: provider routing, model listing, API conversion,
load balancing, and AI provider key management.
"""
import json
import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, StreamingResponse

from open_webui.env import BIFROST_BASE_URL
from open_webui.models.api_keys import ApiKeys
from open_webui.models.usage_logs import UsageLogs
from open_webui.models.users import UserModel
from open_webui.utils.auth import get_admin_user, get_verified_user

log = logging.getLogger(__name__)

router = APIRouter()

BIFROST_TIMEOUT = 300  # seconds for streaming requests


async def get_bifrost_client() -> httpx.AsyncClient:
    """Create an HTTPX client configured for Bifrost."""
    return httpx.AsyncClient(
        base_url=BIFROST_BASE_URL,
        timeout=httpx.Timeout(BIFROST_TIMEOUT),
        follow_redirects=True,
    )


async def validate_and_enforce_limits(
    request: Request,
    user: UserModel,
) -> None:
    """Check rate limits and spending limits for the user/key.

    Raises HTTPException if limits are exceeded.
    """
    # Check if this request uses an API key
    api_key_id = getattr(request.state, "api_key_id", None)
    if api_key_id:
        # Check spending limit
        key = await ApiKeys.get_key_by_id(api_key_id)
        if key and key.spending_limit is not None and key.spending_limit > 0:
            # Get current spending for this key
            from open_webui.models.usage_logs import UsageLogs
            stats = await UsageLogs.get_usage_stats_by_api_key(api_key_id)
            current_spend = stats.get("total_cost", 0)
            if current_spend >= key.spending_limit:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Spending limit of ${key.spending_limit:.2f} exceeded",
                )

    # Rate limiting is handled by the existing RateLimiter middleware
    # applied to specific endpoints in the main app


async def proxy_request(
    request: Request,
    path: str,
    user: UserModel,
) -> StreamingResponse | JSONResponse:
    """Forward a request to Bifrost and return the response."""
    body = await request.body()
    headers = {
        "Content-Type": request.headers.get("Content-Type", "application/json"),
        "Accept": request.headers.get("Accept", "application/json"),
        "Authorization": request.headers.get("Authorization", ""),
    }
    # Forward user info for audit/logging if configured
    if user:
        headers["X-User-Id"] = user.id
        headers["X-User-Email"] = user.email
        headers["X-User-Role"] = user.role

    await validate_and_enforce_limits(request, user)

    async with await get_bifrost_client() as client:
        try:
            bifrost_resp = await client.request(
                method=request.method,
                url=path,
                content=body,
                headers=headers,
            )
        except httpx.TimeoutException:
            return JSONResponse(
                status_code=504,
                content={"error": "Bifrost upstream timeout", "detail": "AI provider did not respond in time"},
            )
        except httpx.ConnectError:
            return JSONResponse(
                status_code=502,
                content={"error": "Bifrost unavailable", "detail": "AI gateway is not reachable"},
            )
        except Exception as e:
            log.error(f"Bifrost proxy error: {e}")
            return JSONResponse(
                status_code=502,
                content={"error": "Bifrost proxy error", "detail": str(e)},
            )

    # Record usage for billing (if it's a chat completion)
    api_key_id = getattr(request.state, "api_key_id", None)
    model_name = ""
    prompt_tokens = 0
    completion_tokens = 0

    # Try to extract usage from Bifrost response headers if available
    if "X-Usage-Prompt-Tokens" in bifrost_resp.headers:
        prompt_tokens = int(bifrost_resp.headers.get("X-Usage-Prompt-Tokens", 0))
        completion_tokens = int(bifrost_resp.headers.get("X-Usage-Completion-Tokens", 0))
        model_name = bifrost_resp.headers.get("X-Model-Name", "")

    if prompt_tokens > 0 or completion_tokens > 0:
        cost = UsageLogs.calculate_cost(model_name, prompt_tokens, completion_tokens)
        await UsageLogs.insert_new_log(
            user_id=user.id,
            model=model_name,
            provider="bifrost",
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cost=cost,
            api_key_id=api_key_id,
        )

    # Return streaming or JSON response
    content_type = bifrost_resp.headers.get("Content-Type", "")
    if "text/event-stream" in content_type or "application/x-ndjson" in content_type:

        async def stream():
            try:
                async for chunk in bifrost_resp.aiter_bytes():
                    yield chunk
            except Exception as e:
                log.error(f"Stream error: {e}")

        return StreamingResponse(
            stream(),
            media_type=content_type,
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        )
    else:
        try:
            data = bifrost_resp.json()
        except Exception:
            data = {"status": bifrost_resp.status_code}
        return JSONResponse(content=data, status_code=bifrost_resp.status_code)


# ── Chat Completions ─────────────────────────────────────────────


@router.post("/v1/chat/completions")
async def chat_completions(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible chat completions, proxied to Bifrost."""
    return await proxy_request(request, "/v1/chat/completions", user)


@router.post("/chat/completions")
async def chat_completions_unversioned(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """Unversioned chat completions endpoint."""
    return await proxy_request(request, "/v1/chat/completions", user)


# ── Models ───────────────────────────────────────────────────────


@router.get("/v1/models")
async def list_models(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """List available models from Bifrost."""
    async with await get_bifrost_client() as client:
        try:
            resp = await client.get("/v1/models")
            return JSONResponse(content=resp.json(), status_code=resp.status_code)
        except Exception as e:
            log.error(f"Failed to fetch models from Bifrost: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch models from AI gateway")


@router.get("/api/models")
async def list_models_api(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """List models (unversioned API path)."""
    return await list_models(request, user)


# ── Completions (text) ────────────────────────────────────────────


@router.post("/v1/completions")
async def completions(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible text completions."""
    return await proxy_request(request, "/v1/completions", user)


# ── Embeddings ────────────────────────────────────────────────────


@router.post("/v1/embeddings")
async def embeddings(
    request: Request,
    user: UserModel = Depends(get_verified_user),
):
    """OpenAI-compatible embeddings."""
    return await proxy_request(request, "/v1/embeddings", user)


# ── Admin: get models from Bifrost ────────────────────────────────


@router.get("/admin/models")
async def admin_list_models(
    request: Request,
    user: UserModel = Depends(get_admin_user),
):
    """Admin: list all models from Bifrost with details."""
    async with await get_bifrost_client() as client:
        try:
            resp = await client.get("/admin/models")
            return JSONResponse(content=resp.json(), status_code=resp.status_code)
        except Exception as e:
            log.error(f"Failed to fetch admin models from Bifrost: {e}")
            raise HTTPException(status_code=502, detail="Failed to fetch models from AI gateway")


# ── Health ─────────────────────────────────────────────────────────


@router.get("/health")
async def bifrost_health():
    """Check if Bifrost is reachable."""
    async with await get_bifrost_client() as client:
        try:
            resp = await client.get("/health")
            return JSONResponse(content={"bifrost": resp.status_code == 200})
        except Exception:
            return JSONResponse(content={"bifrost": False}, status_code=503)
