# Phase 1: Hetzner VPS Infrastructure Setup — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Deploy the existing Next.js web app on a Hetzner VPS with Docker + Caddy, keeping Supabase and Cloudinary as-is.

**Architecture:** Multi-stage Docker build for Next.js standalone output, Caddy as reverse proxy with auto-SSL, multi-client directory layout on VPS for future scalability.

**Tech Stack:** Docker, Docker Compose, Caddy 2, Node.js 20 Alpine, pnpm 10, Next.js 15 standalone output

---

## Pre-requisites (Manual — Hetzner Dashboard)

Before running any tasks, the developer must:
1. Log into Hetzner Cloud console
2. Create a CX32 VPS in Singapore with Ubuntu 24.04 LTS
3. Add their SSH public key during creation
4. Note the VPS IP address

---

### Task 1: Add `output: 'standalone'` to Next.js Config

**Files:**
- Modify: `apps/web/next.config.ts:3`

**Step 1: Modify next.config.ts**

Add `output: 'standalone'` to the Next.js config object. This makes `next build` produce a self-contained output in `.next/standalone/` that includes only the necessary `node_modules` — reducing the Docker image from ~1GB to ~100MB.

In `apps/web/next.config.ts`, add after line 3:

```ts
const nextConfig: NextConfig = {
  output: 'standalone',
  // ... rest stays the same
```

**Step 2: Verify build still works**

Run from monorepo root:
```bash
cd apps/web && npx next build
```

Expected: Build succeeds. You should see `.next/standalone/` directory created.

**Step 3: Commit**

```bash
git add apps/web/next.config.ts
git commit -m "feat(web): enable standalone output for Docker deployment"
```

---

### Task 2: Create .dockerignore

**Files:**
- Create: `apps/web/.dockerignore`

**Step 1: Create the file**

Create `apps/web/.dockerignore`:

```
node_modules
.next
.git
.gitignore
.env*
*.md
.vercel
scripts
migrations
vitest.config.ts
vitest.setup.ts
eslint.config.mjs
tsconfig.tsbuildinfo
```

**Step 2: Commit**

```bash
git add apps/web/.dockerignore
git commit -m "chore(web): add .dockerignore for Docker builds"
```

---

### Task 3: Create Dockerfile.web

**Files:**
- Create: `infra/Dockerfile.web`

**Step 1: Create the Dockerfile**

This is a multi-stage build. The monorepo structure requires copying workspace dependencies (`packages/types`) alongside the web app. The Dockerfile build context will be the **monorepo root** (not `apps/web/`).

Create `infra/Dockerfile.web`:

```dockerfile
# Stage 1: Install dependencies
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

# Copy workspace config
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

# Install production dependencies only
RUN pnpm install --frozen-lockfile

# Stage 2: Build the application
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules

# Copy source files
COPY packages/types ./packages/types
COPY apps/web ./apps/web
COPY pnpm-workspace.yaml package.json turbo.json ./

# Build shared types first, then web app
WORKDIR /app/apps/web
RUN npx next build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "apps/web/server.js"]
```

**Step 2: Commit**

```bash
git add infra/Dockerfile.web
git commit -m "feat(infra): add multi-stage Dockerfile for Next.js web app"
```

---

### Task 4: Create Docker Compose Files

**Files:**
- Create: `infra/docker-compose.caddy.yml`
- Create: `infra/docker-compose.gowater.yml`
- Create: `infra/caddy/Caddyfile`

**Step 1: Create shared Caddy compose file**

Create `infra/docker-compose.caddy.yml`:

```yaml
services:
  caddy:
    image: caddy:2.9-alpine
    container_name: caddy
    ports:
      - "80:80"
      - "443:443"
      - "443:443/udp"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    mem_limit: 256m
    cpus: 0.5
    networks:
      - caddy-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:80"]
      interval: 30s
      timeout: 5s
      retries: 3

volumes:
  caddy_data:
  caddy_config:

networks:
  caddy-net:
    driver: bridge
    name: caddy-net
```

**Step 2: Create Caddyfile**

Create `infra/caddy/Caddyfile`:

```
portal.gowatervendo.com {
    reverse_proxy gowater-web:3000
}
```

**Step 3: Create GoWater client compose file**

Create `infra/docker-compose.gowater.yml`:

```yaml
services:
  gowater-web:
    build:
      context: ..
      dockerfile: infra/Dockerfile.web
    container_name: gowater-web
    env_file: .env.gowater
    restart: unless-stopped
    mem_limit: 512m
    cpus: 1.0
    read_only: true
    tmpfs:
      - /tmp
    security_opt:
      - no-new-privileges:true
    networks:
      - gowater-net
      - caddy-net
    healthcheck:
      test: ["CMD", "wget", "--spider", "-q", "http://localhost:3000"]
      interval: 30s
      timeout: 5s
      retries: 3

networks:
  gowater-net:
    driver: bridge
  caddy-net:
    external: true
    name: caddy-net
```

**Step 4: Create template .env file for VPS**

Create `infra/.env.gowater.example`:

```bash
# Supabase (keep existing values from Vercel)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Auth
JWT_SECRET=

# Cloudinary (keep existing values from Vercel)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# App
NODE_ENV=production
NEXT_PUBLIC_ADMIN_EMAILS=
```

**Step 5: Commit**

```bash
git add infra/docker-compose.caddy.yml infra/docker-compose.gowater.yml infra/caddy/Caddyfile infra/.env.gowater.example
git commit -m "feat(infra): add Docker Compose and Caddy configs for Hetzner deployment"
```

---

### Task 5: Create VPS Setup Script

**Files:**
- Create: `infra/scripts/setup-vps.sh`

**Step 1: Create the setup script**

This script is run once on a fresh Ubuntu 24.04 VPS. It hardens SSH, installs Docker, sets up the directory structure, and creates the deploy user.

Create `infra/scripts/setup-vps.sh`:

```bash
#!/bin/bash
set -euo pipefail

# ============================================================
# GoWater VPS Setup Script
# Run as root on a fresh Ubuntu 24.04 LTS Hetzner VPS
# Usage: bash setup-vps.sh <SSH_PUBLIC_KEY>
# ============================================================

SSH_PORT=2222
DEPLOY_USER=deploy

if [ $# -lt 1 ]; then
    echo "Usage: bash setup-vps.sh <SSH_PUBLIC_KEY>"
    echo "Example: bash setup-vps.sh 'ssh-ed25519 AAAA... user@host'"
    exit 1
fi

SSH_PUBLIC_KEY="$1"

echo "=== Updating system ==="
apt-get update && apt-get upgrade -y

echo "=== Installing essentials ==="
apt-get install -y \
    ufw \
    fail2ban \
    unattended-upgrades \
    apt-listchanges \
    curl \
    wget \
    git

echo "=== Creating deploy user ==="
useradd -m -s /bin/bash "$DEPLOY_USER"
mkdir -p /home/$DEPLOY_USER/.ssh
echo "$SSH_PUBLIC_KEY" > /home/$DEPLOY_USER/.ssh/authorized_keys
chmod 700 /home/$DEPLOY_USER/.ssh
chmod 600 /home/$DEPLOY_USER/.ssh/authorized_keys
chown -R $DEPLOY_USER:$DEPLOY_USER /home/$DEPLOY_USER/.ssh

echo "=== Configuring SSH ==="
cat > /etc/ssh/sshd_config.d/hardened.conf << 'SSHEOF'
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AuthorizedKeysFile .ssh/authorized_keys
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
SSHEOF
systemctl restart sshd

echo "=== Configuring UFW firewall ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow $SSH_PORT/tcp comment 'SSH'
ufw allow 80/tcp comment 'HTTP'
ufw allow 443/tcp comment 'HTTPS'
echo "y" | ufw enable

echo "=== Configuring fail2ban ==="
cat > /etc/fail2ban/jail.local << 'F2BEOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3

[sshd]
enabled = true
port = 2222
F2BEOF
systemctl enable fail2ban
systemctl restart fail2ban

echo "=== Enabling unattended-upgrades ==="
dpkg-reconfigure -plow unattended-upgrades

echo "=== Installing Docker ==="
curl -fsSL https://get.docker.com | sh
usermod -aG docker $DEPLOY_USER

echo "=== Creating directory structure ==="
mkdir -p /srv/shared/caddy
mkdir -p /srv/clients/gowater/data
chown -R $DEPLOY_USER:$DEPLOY_USER /srv

echo "=== Creating caddy-net Docker network ==="
docker network create caddy-net || true

echo ""
echo "============================================"
echo "  VPS setup complete!"
echo "============================================"
echo ""
echo "  SSH port: $SSH_PORT"
echo "  Deploy user: $DEPLOY_USER"
echo ""
echo "  Next steps:"
echo "  1. Test SSH: ssh $DEPLOY_USER@<VPS_IP> -p $SSH_PORT"
echo "  2. Copy infra files to /srv/"
echo "  3. Start Caddy: cd /srv/shared && docker compose -f docker-compose.caddy.yml up -d"
echo "  4. Configure .env.gowater in /srv/clients/gowater/"
echo "  5. Start app: cd /srv/clients/gowater && docker compose -f docker-compose.gowater.yml up -d"
echo "  6. Point DNS: portal.gowatervendo.com -> <VPS_IP>"
echo ""
```

**Step 2: Commit**

```bash
chmod +x infra/scripts/setup-vps.sh
git add infra/scripts/setup-vps.sh
git commit -m "feat(infra): add VPS security hardening and setup script"
```

---

### Task 6: Create Deploy Script

**Files:**
- Create: `infra/scripts/deploy.sh`

**Step 1: Create the deploy script**

This is run from the developer's local machine to deploy updates to the VPS.

Create `infra/scripts/deploy.sh`:

```bash
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

echo "=== Copying infra files ==="
rsync -avz \
    -e "ssh -p $SSH_PORT" \
    infra/docker-compose.caddy.yml infra/caddy/ \
    "$DEPLOY_USER@$VPS_IP:/srv/shared/"

echo "=== Building and restarting containers ==="
$SSH_CMD "cd $REMOTE_DIR && docker compose -f $REMOTE_DIR/src/infra/docker-compose.gowater.yml up -d --build"

echo "=== Checking health ==="
sleep 5
$SSH_CMD "docker ps --format 'table {{.Names}}\t{{.Status}}'"

echo ""
echo "Deploy complete! Check: https://portal.gowatervendo.com"
```

**Step 2: Commit**

```bash
chmod +x infra/scripts/deploy.sh
git add infra/scripts/deploy.sh
git commit -m "feat(infra): add deploy script for VPS updates"
```

---

### Task 7: Test Docker Build Locally

**Step 1: Test the Docker build from monorepo root**

```bash
docker build -f infra/Dockerfile.web -t gowater-web:test .
```

Expected: Build completes successfully. Final image should be ~100-200MB.

**Step 2: Test running the container locally**

```bash
docker run --rm -p 3000:3000 \
  -e NODE_ENV=production \
  -e NEXT_PUBLIC_SUPABASE_URL=https://ztmppsfcnbqwiqilmoed.supabase.co \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=test \
  gowater-web:test
```

Expected: Container starts, logs show `Ready on http://0.0.0.0:3000`. The app may not fully work without all env vars, but it should start.

**Step 3: Check image size**

```bash
docker images gowater-web:test --format "{{.Size}}"
```

Expected: Under 300MB.

**Step 4: Clean up**

```bash
docker rmi gowater-web:test
```

---

### Task 8: VPS Provisioning and Deployment (Manual)

This task is done on Hetzner Cloud dashboard + terminal. Not automated.

**Step 1: Create VPS on Hetzner Cloud**

1. Log into https://console.hetzner.cloud
2. Create new server: CX32, Singapore, Ubuntu 24.04, add your SSH key
3. Note the IP address

**Step 2: Run setup script**

```bash
ssh root@<VPS_IP>
# Upload and run setup script
bash setup-vps.sh 'ssh-ed25519 AAAA... your-key-here'
```

**Step 3: Verify SSH as deploy user**

```bash
ssh deploy@<VPS_IP> -p 2222
```

**Step 4: Copy Caddy config and start Caddy**

```bash
# From local machine
scp -P 2222 infra/docker-compose.caddy.yml deploy@<VPS_IP>:/srv/shared/docker-compose.yml
scp -P 2222 -r infra/caddy/ deploy@<VPS_IP>:/srv/shared/caddy/

# On VPS
ssh deploy@<VPS_IP> -p 2222
cd /srv/shared && docker compose up -d
```

**Step 5: Create .env.gowater on VPS**

```bash
# On VPS
nano /srv/clients/gowater/.env.gowater
# Paste all env vars from your Vercel project settings
```

**Step 6: Deploy the app**

From local machine:
```bash
bash infra/scripts/deploy.sh <VPS_IP>
```

**Step 7: Update DNS**

In your domain registrar, update `portal.gowatervendo.com` A record to point to `<VPS_IP>`.

**Step 8: Verify**

1. Wait for DNS propagation (may take a few minutes to hours)
2. Visit https://portal.gowatervendo.com — should load the app with valid SSL
3. Test login from mobile app
4. Test check-in/checkout flow with photo

**Step 9: Commit any fixes**

If anything needed tweaking during deployment, commit the fixes:

```bash
git add -A
git commit -m "fix(infra): deployment adjustments from initial VPS setup"
```

---

## Summary of Files Created/Modified

| Action | File | Purpose |
|--------|------|---------|
| Modify | `apps/web/next.config.ts` | Add `output: 'standalone'` |
| Create | `apps/web/.dockerignore` | Exclude files from Docker build |
| Create | `infra/Dockerfile.web` | Multi-stage Next.js Docker build |
| Create | `infra/docker-compose.caddy.yml` | Shared Caddy reverse proxy |
| Create | `infra/docker-compose.gowater.yml` | GoWater client compose |
| Create | `infra/caddy/Caddyfile` | Caddy routing rules |
| Create | `infra/.env.gowater.example` | Template env file for VPS |
| Create | `infra/scripts/setup-vps.sh` | One-time VPS hardening script |
| Create | `infra/scripts/deploy.sh` | Ongoing deploy script |

## Post-Deployment Verification Checklist

- [ ] VPS accessible via SSH on port 2222
- [ ] UFW firewall active (80, 443, 2222 only)
- [ ] Caddy running and serving SSL
- [ ] Next.js container healthy
- [ ] `portal.gowatervendo.com` loads the web app
- [ ] Mobile app can connect and authenticate
- [ ] Check-in/checkout with photo works
- [ ] Vercel deployment kept as fallback (do not delete yet)
