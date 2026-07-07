#!/bin/bash
# =============================================================================
# validate.sh — Validate all required environment variables are set
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

ENV_FILE="${1:-.env}"
COMPOSE_FILE="infrastructure/docker-compose.prod.yml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "=== Validating environment variables ==="
echo ""

# Load .env if it exists
if [ -f "$ENV_FILE" ]; then
    echo "Loading environment from: ${ENV_FILE}"
    set -a
    source "$ENV_FILE"
    set +a
else
    echo -e "${YELLOW}WARNING: ${ENV_FILE} not found. Checking system environment only.${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# Required variables (service:variable format)
REQUIRED_VARS=(
    "postgres:POSTGRES_PASSWORD"
    "postgres:POSTGRES_USER"
    "postgres:POSTGRES_DB"
    "zitadel:ZITADEL_MASTERKEY"
    "zitadel:ZITADEL_OIDC_URL"
    "bifrost:OPENAI_API_KEY"
    "bifrost:ANTHROPIC_API_KEY"
    "main-backend:MAINBACKEND_DATABASE_URL"
    "main-backend:ZITADEL_OPENWEBUI_CLIENT_ID"
    "main-backend:ZITADEL_OPENWEBUI_CLIENT_SECRET"
    "main-backend:JWT_SECRET"
    "main-backend:WEBUI_SECRET_KEY"
    "optamusui:WEBUI_SECRET_KEY"
    "optamusui:ZITADEL_OPENWEBUI_CLIENT_ID"
    "optamusui:ZITADEL_OPENWEBUI_CLIENT_SECRET"
    "optamusui:ZITADEL_OIDC_URL"
    "admin-dashboard:API_BASE_URL"
    "admin-dashboard:AUTH_BASE_URL"
)

# Check each required variable
for var in "${REQUIRED_VARS[@]}"; do
    service="${var%%:*}"
    varname="${var##*:}"
    
    if [ -z "${!varname:-}" ]; then
        echo -e "${RED}✗${NC} ${service}: ${varname} is NOT set"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} ${service}: ${varname} is set"
    fi
done

echo ""

# Check for at least one AI provider key
if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
    echo -e "${RED}✗${NC} At least one AI provider key is required (OPENAI_API_KEY or ANTHROPIC_API_KEY)"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✓${NC} AI provider key is configured"
fi

echo ""

# Validate JWT secret length
if [ -n "${JWT_SECRET:-}" ]; then
    if [ ${#JWT_SECRET} -lt 32 ]; then
        echo -e "${RED}✗${NC} JWT_SECRET must be at least 32 characters (current: ${#JWT_SECRET})"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} JWT_SECRET length is sufficient (${#JWT_SECRET} chars)"
    fi
fi

# Validate Zitadel OIDC URL format
if [ -n "${ZITADEL_OIDC_URL:-}" ]; then
    if [[ ! "${ZITADEL_OIDC_URL}" =~ ^https?:// ]]; then
        echo -e "${RED}✗${NC} ZITADEL_OIDC_URL must start with http:// or https:// (current: ${ZITADEL_OIDC_URL})"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✓${NC} ZITADEL_OIDC_URL format is valid"
    fi
fi

# Validate PostgreSQL password is not default
if [ "${POSTGRES_PASSWORD:-}" = "postgres" ] || [ "${POSTGRES_PASSWORD:-}" = "change-me-postgres-password" ]; then
    echo -e "${YELLOW}⚠${NC} POSTGRES_PASSWORD is using a default/weak value"
    WARNINGS=$((WARNINGS + 1))
fi

# Validate WEBUI_SECRET_KEY is not default
if [ "${WEBUI_SECRET_KEY:-}" = "change-me-webui-secret" ]; then
    echo -e "${YELLOW}⚠${NC} WEBUI_SECRET_KEY is using a default value"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=== Validation Summary ==="
echo -e "Errors:   ${ERRORS}"
echo -e "Warnings: ${WARNINGS}"
echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}Validation FAILED. Please fix the errors above before deploying.${NC}"
    exit 1
else
    echo -e "${GREEN}Validation PASSED. Environment is ready for deployment.${NC}"
    exit 0
fi
