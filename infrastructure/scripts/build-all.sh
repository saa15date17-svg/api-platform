#!/bin/bash
# =============================================================================
# build-all.sh — Build all service Docker images
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="infrastructure/docker-compose.prod.yml"
BUILD_HASH="${BUILD_HASH:-$(git rev-parse --short HEAD 2>/dev/null || echo 'dev')}"

echo "=== Building all service images (${BUILD_HASH}) ==="
echo ""

# ─── Pre-flight checks ─────────────────────────────────────────────────────
if ! command -v docker &> /dev/null; then
    echo "ERROR: docker is not installed or not in PATH" >&2
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo "ERROR: docker compose is not available" >&2
    exit 1
fi

# ─── Build each service ─────────────────────────────────────────────────────
echo "[1/4] Building main-backend..."
docker compose -f "${COMPOSE_FILE}" build --build-arg BUILD_HASH="${BUILD_HASH}" main-backend
echo "  ✓ main-backend built"

echo "[2/4] Building optamusui..."
docker compose -f "${COMPOSE_FILE}" build --build-arg BUILD_HASH="${BUILD_HASH}" optamusui
echo "  ✓ optamusui built"

echo "[3/4] Building admin-dashboard..."
docker compose -f "${COMPOSE_FILE}" build --build-arg BUILD_HASH="${BUILD_HASH}" admin-dashboard
echo "  ✓ admin-dashboard built"

echo "[4/4] Pulling external images (zitadel, bifrost, postgres)..."
docker compose -f "${COMPOSE_FILE}" pull zitadel bifrost postgres
echo "  ✓ External images pulled"

echo ""
echo "=== All images built successfully ==="
echo ""
echo "Images:"
docker images --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}" | grep -E "api-platform|REPOSITORY"
