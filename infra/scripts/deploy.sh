#!/bin/bash
set -euo pipefail

# ============================================================
# GoWater Deploy Script
# Run from monorepo root on your local machine
# Usage: bash infra/scripts/deploy.sh <VPS_IP>
# ============================================================

SSH_PORT=2222
DEPLOY_USER=deploy
REMOTE_DIR=/srv/clients/gowater

if [ $# -lt 1 ]; then
    echo "Usage: bash infra/scripts/deploy.sh <VPS_IP>"
    exit 1
fi

VPS_IP="$1"
SSH_CMD="ssh -p $SSH_PORT $DEPLOY_USER@$VPS_IP"

echo "=== Deploying GoWater to $VPS_IP ==="

echo "=== Syncing project files ==="
rsync -avz --delete \
    -e "ssh -p $SSH_PORT" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='.git' \
    --exclude='.env*' \
    --exclude='apps/mobile' \
    --exclude='*.md' \
    --exclude='.vercel' \
    ./ "$DEPLOY_USER@$VPS_IP:$REMOTE_DIR/src/"

echo "=== Copying Caddy compose ==="
rsync -avz \
    -e "ssh -p $SSH_PORT" \
    infra/docker-compose.caddy.yml \
    "$DEPLOY_USER@$VPS_IP:/srv/shared/"

echo "=== Copying Caddyfile ==="
rsync -avz \
    -e "ssh -p $SSH_PORT" \
    infra/caddy/ \
    "$DEPLOY_USER@$VPS_IP:/srv/shared/caddy/"

echo "=== Reloading Caddy config ==="
$SSH_CMD "docker exec caddy caddy reload --config /etc/caddy/Caddyfile" || true

echo "=== Building and restarting containers ==="
$SSH_CMD "cd $REMOTE_DIR && docker compose -f $REMOTE_DIR/src/infra/docker-compose.gowater.yml up -d --build"

echo "=== Checking health ==="
sleep 5
$SSH_CMD "docker ps --format 'table {{.Names}}\t{{.Status}}'"

echo ""
echo "Deploy complete! Check: https://portal.gowatervendo.com"
