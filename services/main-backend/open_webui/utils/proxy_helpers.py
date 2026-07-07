"""Shared helper functions for proxying requests to model providers.

Used by both the Ollama and OpenAI router modules to avoid code
duplication of common HTTP helper utilities.
"""

from __future__ import annotations

import logging
from typing import Optional

import aiohttp

from open_webui.env import (
    AIOHTTP_CLIENT_SESSION_SSL,
    AIOHTTP_CLIENT_TIMEOUT_MODEL_LIST,
    ENABLE_FORWARD_USER_INFO_HEADERS,
)
from open_webui.utils.headers import include_user_info_headers
from open_webui.utils.session_pool import get_session

log = logging.getLogger(__name__)

# Headers that become stale after aiohttp auto-decompresses the upstream
# response body.  Forwarding them verbatim causes desktop / programmatic
# clients to attempt decompression of an already-decoded payload, resulting
# in ZlibError.  See https://github.com/aio-libs/aiohttp/issues/4462.
STRIP_PROXY_HEADERS = frozenset(
    {'Content-Encoding', 'Content-Length', 'Transfer-Encoding'}
)


def clean_proxy_headers(raw_headers) -> dict:
    """Return a copy of *raw_headers* with stale encoding headers removed."""
    return {k: v for k, v in raw_headers.items() if k not in STRIP_PROXY_HEADERS}


async def send_get_request(
    url: str,
    key: str | None = None,
    user=None,
    request=None,
    config=None,
):
    """Issue a GET request to a model-provider backend and return JSON, or *None* on failure.

    When *request* and *config* are both provided, the function delegates
    header/cookie construction to ``get_headers_and_cookies`` from the
    OpenAI router (imported lazily to avoid circular imports).  Otherwise
    a simple ``Bearer``-token header is used, matching the original Ollama
    behaviour.
    """
    timeout = aiohttp.ClientTimeout(total=AIOHTTP_CLIENT_TIMEOUT_MODEL_LIST)
    try:
        if request and config:
            from open_webui.routers.openai import get_headers_and_cookies

            headers, cookies = await get_headers_and_cookies(
                request, url, key, config, user=user
            )
            session = await get_session()
            async with session.get(
                url,
                headers=headers,
                cookies=cookies,
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
                timeout=timeout,
            ) as response:
                return await response.json()
        else:
            headers: dict = {
                'Content-Type': 'application/json',
            }
            if key:
                headers['Authorization'] = f'Bearer {key}'
            if ENABLE_FORWARD_USER_INFO_HEADERS and user:
                headers = include_user_info_headers(headers, user)

            session = await get_session()
            async with session.get(
                url,
                headers=headers,
                ssl=AIOHTTP_CLIENT_SESSION_SSL,
                timeout=timeout,
            ) as r:
                return await r.json()
    except Exception as exc:
        log.error(f'Connection error: {exc}')
        return None
