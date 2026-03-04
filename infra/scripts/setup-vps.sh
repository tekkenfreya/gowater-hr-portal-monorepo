#!/bin/bash
set -euo pipefail

# ============================================================
# GoWater VPS Setup Script
# Run as root on a fresh Ubuntu 24.04 LTS Hetzner VPS
# Usage: bash setup-vps.sh <SSH_PUBLIC_KEY>
# ============================================================

if [ "$EUID" -ne 0 ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

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
