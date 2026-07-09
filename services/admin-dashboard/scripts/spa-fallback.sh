#!/bin/bash
# Copy index.html to each SPA route directory for static hosting (Render, Netlify, etc.)
DIST_DIR="dist"

ROUTES=(
  "login"
  "auth/callback"
  "dashboard"
  "users"
  "api-keys"
  "usage"
  "billing"
  "settings"
  "zitadel"
  "bifrost"
)

for route in "${ROUTES[@]}"; do
  mkdir -p "$DIST_DIR/$route"
  cp "$DIST_DIR/index.html" "$DIST_DIR/$route/index.html"
done

echo "SPA fallback: copied index.html to ${#ROUTES[@]} route directories"
