#!/bin/bash
# One-time initialization script for the server
# Run this once after cloning the repo on the server

set -euo pipefail

echo "=== API Platform — Server Initialization ==="
echo ""

# ─── Create required directories ───
mkdir -p ~/logs
mkdir -p infrastructure/nginx/certs

# ─── Install Nginx if not present ───
if ! command -v nginx &> /dev/null; then
    echo "[1/4] Installing Nginx..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq nginx openssl
    echo "  ✓ Nginx installed"
else
    echo "[1/4] Nginx already installed"
fi

# ─── Restart Nginx with our config ───
echo "[2/4] Configuring Nginx..."
sudo cp infrastructure/nginx/nginx.conf /etc/nginx/sites-available/api-platform
sudo ln -sf /etc/nginx/sites-available/api-platform /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
echo "  ✓ Nginx configured"

# ─── Create Cloudflare DNS records ───
echo "[3/4] DNS setup reminder:"
echo "  Create these CNAME records in Cloudflare DNS:"
echo "    app   → optamus.cloud (proxied)"
echo "    admin → optamus.cloud (proxied)"
echo "    api   → optamus.cloud (proxied)"
echo "    auth  → optamus.cloud (proxied)"
echo ""

# ─── Deploy services ───
echo "[4/4] Deploying services..."
bash infrastructure/scripts/deploy.sh

echo ""
echo "=== Initialization complete ==="
