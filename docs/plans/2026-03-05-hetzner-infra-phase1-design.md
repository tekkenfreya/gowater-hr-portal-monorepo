# Phase 1: Hetzner VPS Infrastructure Setup

> **Date:** 2026-03-05
> **Status:** Approved
> **Scope:** Deploy Next.js app on Hetzner VPS with Docker + Caddy. No code changes to DB or photo storage.

---

## Overview

Migrate the Next.js web app from Vercel to a self-hosted Hetzner VPS. The app continues to use Supabase (hosted DB) and Cloudinary (photo storage) — only the hosting platform changes.

## Migration Phases

| Phase | Scope | Status |
|-------|-------|--------|
| **1 (this)** | VPS + Docker + Caddy | In progress |
| 2 | Replace Cloudinary with Satori+Sharp + Hetzner Object Storage | Not started |
| 3 | Migrate DB from Supabase to self-hosted PostgreSQL | Not started |

## VPS Specification

- **Provider:** Hetzner Cloud
- **Plan:** CX32 (4 vCPU, 8GB RAM, ~$7.50/mo)
- **Region:** Singapore
- **OS:** Ubuntu 24.04 LTS

## Security Hardening

- SSH: key-only auth, disable password + root login, non-standard port (2222)
- UFW firewall: default deny incoming, allow 80, 443, 2222
- fail2ban: enabled for SSH
- Non-root deploy user with Docker group access
- unattended-upgrades for OS security patches

## VPS Directory Structure

```
/srv/
├── shared/
│   ├── docker-compose.yml      # Caddy reverse proxy
│   └── caddy/
│       └── Caddyfile
├── clients/
│   └── gowater/
│       ├── docker-compose.yml  # Next.js app
│       ├── .env                # App secrets
│       └── data/               # Future volumes
```

## Docker Configuration

### Dockerfile.web (multi-stage)

- **Stage 1 (deps):** `node:20-alpine`, pnpm install (production deps only)
- **Stage 2 (builder):** Copy source, `pnpm build` with `output: 'standalone'`
- **Stage 3 (runner):** `node:20-alpine`, copy standalone output only, `USER nextjs`, expose 3000
- Final image ~100MB

### docker-compose (gowater client)

```yaml
services:
  gowater-web:
    build:
      context: .
      dockerfile: Dockerfile.web
    env_file: .env
    restart: unless-stopped
    mem_limit: 512m
    cpus: 1.0
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
```

### docker-compose (shared Caddy)

```yaml
services:
  caddy:
    image: caddy:2-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile
      - caddy_data:/data
      - caddy_config:/config
    restart: unless-stopped
    networks:
      - caddy-net

volumes:
  caddy_data:
  caddy_config:

networks:
  caddy-net:
    driver: bridge
```

### Caddyfile

```
portal.gowatervendo.com {
    reverse_proxy gowater-web:3000
}
```

## Code Changes Required

1. **`apps/web/next.config.ts`** — Add `output: 'standalone'`
2. **`infra/Dockerfile.web`** — Create multi-stage Dockerfile
3. **`infra/docker-compose.gowater.yml`** — Client compose file
4. **`infra/docker-compose.caddy.yml`** — Shared Caddy compose file
5. **`infra/caddy/Caddyfile`** — Reverse proxy config
6. **`infra/.dockerignore`** — Exclude node_modules, .git, .env, etc.

## Deployment Workflow

### Initial deployment (one-time):

1. Provision CX32 Singapore VPS via Hetzner Cloud dashboard
2. SSH in, apply security hardening
3. Install Docker + Docker Compose
4. Create `/srv/` directory structure
5. Create `caddy-net` Docker network: `docker network create caddy-net`
6. Set up Caddy: copy files, `docker compose up -d`
7. Clone repo or copy built files to `/srv/clients/gowater/`
8. Configure `.env` (Supabase + Cloudinary + JWT credentials)
9. Build and start: `docker compose up -d --build`
10. Update DNS: `portal.gowatervendo.com` A record → Hetzner VPS IP
11. Caddy auto-provisions SSL via Let's Encrypt
12. Verify app is live and mobile app connects

### Ongoing deploys:

```bash
ssh deploy@vps -p 2222
cd /srv/clients/gowater
git pull origin main
docker compose up -d --build
```

### Rollback:

Point DNS back to Vercel. Supabase + Cloudinary are unchanged, so Vercel deployment still works as fallback.

## What Stays the Same

- Supabase as database (no migration)
- Cloudinary for photo storage + watermarking (no changes)
- Mobile app URL (`portal.gowatervendo.com`) — same domain, new server
- All API endpoints, auth flow, business logic
