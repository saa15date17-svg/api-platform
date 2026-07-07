#!/bin/bash
# API Platform — Deployment Script
# Run from the server to deploy/update all services

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$SCRIPT_DIR"

echo "=== API Platform Deployment ==="
echo ""

# ─── 1. Generate self-signed cert for Nginx ───
echo "[1/5] Generating Nginx TLS certificate..."
mkdir -p infrastructure/nginx/certs
if [ ! -f infrastructure/nginx/certs/cert.pem ]; then
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout infrastructure/nginx/certs/key.pem \
        -out infrastructure/nginx/certs/cert.pem \
        -subj "/CN=optamus.cloud" 2>/dev/null
    echo "  ✓ Certificate created"
else
    echo "  ✓ Certificate exists, skipping"
fi

# ─── 2. Update Cloudflare tunnel config ───
echo "[2/5] Updating Cloudflare tunnel configuration..."
cp infrastructure/cloudflare/tunnel-config.yml ~/.cloudflared/config.yml
echo "  ✓ Tunnel config updated"

# ─── 3. Restart Cloudflare tunnel ───
echo "[3/5] Restarting Cloudflare tunnel..."
if pgrep -x cloudflared > /dev/null 2>&1; then
    pkill -x cloudflared 2>/dev/null || true
    sleep 2
fi
nohup cloudflared tunnel --config ~/.cloudflared/config.yml run > ~/logs/cloudflared.log 2>&1 &
echo "  ✓ Tunnel started (PID: $!)"

# ─── 4. Build and start Docker services ───
echo "[4/5] Building and starting Docker services..."
docker compose -f infrastructure/docker-compose.yml --profile full up -d --build
echo "  ✓ Services started"

# ─── 5. Verify deployment ───
echo "[5/5] Verifying deployment..."
sleep 5
echo ""
echo "  Running containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "=== Deployment complete ==="
echo ""
echo "Access your services at:"
echo "  https://app.optamus.cloud    — OptamusUI (Chat)"
echo "  https://admin.optamus.cloud  — Admin Dashboard"
echo "  https://api.optamus.cloud    — API (Developer)"
echo "  https://auth.optamus.cloud   — Zitadel (Auth)"
