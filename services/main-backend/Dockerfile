# syntax=docker/dockerfile:1
FROM python:3.11-slim-bookworm AS base

ENV PYTHONUNBUFFERED=1
ENV PORT=9000

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl jq ca-certificates git \
    && rm -rf /var/lib/apt/lists/*

COPY services/main-backend/requirements.txt ./requirements.txt

ENV UV_LINK_MODE=copy

RUN set -e; \
    pip3 install --no-cache-dir uv; \
    uv pip install --system -r requirements.txt --no-cache-dir; \
    mkdir -p /app/data; chown -R 0:0 /app/data/

COPY services/main-backend/ .

EXPOSE 9000

HEALTHCHECK CMD curl --silent --fail http://localhost:${PORT:-9000}/health | jq -ne 'input.status == true' || exit 1

CMD [ "bash", "start.sh"]
