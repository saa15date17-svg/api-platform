# Deployment Guide

## Prerequisites

- Server with Docker and Docker Compose installed
- Cloudflare Tunnel installed and authenticated
- Domain `optamus.cloud` configured in Cloudflare

## Step 1: DNS Records

Create these CNAME records in Cloudflare DNS:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | app | optamus.cloud | Proxied |
| CNAME | admin | optamus.cloud | Proxied |
| CNAME | api | optamus.cloud | Proxied |
| CNAME | auth | optamus.cloud | Proxied |

## Step 2: Server Initialization

```bash
# Copy the project to the server
scp -r /home/devagent/API_PLATFORM devagent@192.168.1.161:~/

# SSH into the server
ssh devagent@192.168.1.161

# Run initialization
cd ~/API_PLATFORM
bash infrastructure/scripts/init.sh
```

## Step 3: Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
# - PostgreSQL passwords
# - Zitadel OIDC client IDs/secrets
# - JWT secret
# - AI provider API keys (for Bifrost)
```

## Step 4: Deploy

```bash
bash infrastructure/scripts/deploy.sh
```

## Step 5: Verify

```bash
# Check all containers are running
docker ps

# Test health endpoint
curl https://api.optamus.cloud/health

# Test Zitadel
curl https://auth.optamus.cloud

# Test OptamusUI
curl https://app.optamus.cloud
```

## Updating

```bash
# Pull latest changes
git pull

# Rebuild and restart
bash infrastructure/scripts/deploy.sh
```
