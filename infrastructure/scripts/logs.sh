#!/bin/bash
# =============================================================================
# logs.sh — Tail logs from all services
# =============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$SCRIPT_DIR"

COMPOSE_FILE="infrastructure/docker-compose.prod.yml"
SERVICES=("postgres" "zitadel" "bifrost" "main-backend" "optamusui" "admin-dashboard")

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Parse arguments
FOLLOW=false
LINES=50
SERVICE_FILTER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--follow)
            FOLLOW=true
            shift
            ;;
        -n|--lines)
            LINES="$2"
            shift 2
            ;;
        -s|--service)
            SERVICE_FILTER="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS] [SERVICE]"
            echo ""
            echo "Options:"
            echo "  -f, --follow    Follow log output (like tail -f)"
            echo "  -n, --lines N   Number of lines to show (default: 50)"
            echo "  -s, --service   Filter by service name"
            echo "  -h, --help      Show this help"
            echo ""
            echo "Services: postgres, zitadel, bifrost, main-backend, optamusui, admin-dashboard"
            echo ""
            echo "Examples:"
            echo "  $0                        # Show last 50 lines from all services"
            echo "  $0 -f                     # Follow all logs"
            echo "  $0 -n 100 -s main-backend # Show last 100 lines from main-backend"
            exit 0
            ;;
        *)
            if [ -n "$SERVICE_FILTER" ]; then
                echo "ERROR: Only one service can be specified" >&2
                exit 1
            fi
            SERVICE_FILTER="$1"
            shift
            ;;
    esac
done

# Validate service filter
if [ -n "$SERVICE_FILTER" ]; then
    if [[ ! " ${SERVICES[*]} " =~ " ${SERVICE_FILTER} " ]]; then
        echo "ERROR: Unknown service '${SERVICE_FILTER}'. Valid services: ${SERVICES[*]}" >&2
        exit 1
    fi
fi

# Check if docker compose is available
if ! docker compose -f "$COMPOSE_FILE" ps &> /dev/null; then
    echo "ERROR: Could not connect to Docker Compose. Is the stack running?" >&2
    exit 1
fi

# Get running services
RUNNING_SERVICES=$(docker compose -f "$COMPOSE_FILE" ps --services --filter "status=running" 2>/dev/null || true)

if [ -z "$RUNNING_SERVICES" ]; then
    echo "No running services found. Deploy the stack first with: ./deploy.sh" >&2
    exit 1
fi

echo "=== Service Logs ==="
echo ""

if [ "$FOLLOW" = true ]; then
    echo -e "${YELLOW}Following logs (Ctrl+C to stop)...${NC}"
    echo ""
    
    if [ -n "$SERVICE_FILTER" ]; then
        docker compose -f "$COMPOSE_FILE" logs -f --tail="$LINES" "$SERVICE_FILTER"
    else
        # Follow all services with color-coded prefixes
        for service in $RUNNING_SERVICES; do
            (
                echo -e "${BLUE}[${service}]${NC} Starting log stream..."
                docker compose -f "$COMPOSE_FILE" logs -f --tail="$LINES" "$service" 2>&1 | \
                    while IFS= read -r line; do
                        echo -e "${BLUE}[${service}]${NC} ${line}"
                    done
            ) &
        done
        wait
    fi
else
    # Show last N lines from each service
    for service in $RUNNING_SERVICES; do
        if [ -n "$SERVICE_FILTER" ] && [ "$service" != "$SERVICE_FILTER" ]; then
            continue
        fi
        
        echo -e "${GREEN}── ${service} ──${NC}"
        docker compose -f "$COMPOSE_FILE" logs --tail="$LINES" "$service" 2>&1 | tail -n "$LINES"
        echo ""
    done
fi
