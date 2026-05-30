#!/usr/bin/env bash
# =============================================================================
# DigitalOcean Droplet Setup Script — VoteSecure
# Run as root on a fresh Ubuntu 22.04 droplet
# Usage: ./do-setup.sh
# =============================================================================
set -e

echo "============================================"
echo " VoteSecure — DigitalOcean Setup"
echo "============================================"

# ── Update system ──────────────────────────────────────────────────────────
echo "[1/8] Updating system packages..."
apt update -y && apt upgrade -y

# ── Install dependencies ───────────────────────────────────────────────────
echo "[2/8] Installing dependencies..."
apt install -y python3 python3-pip python3-venv nginx mysql-server \
    nodejs npm certbot python3-certbot-nginx git

# ── Setup MySQL ────────────────────────────────────────────────────────────
echo "[3/8] Setting up MySQL..."
systemctl start mysql
systemctl enable mysql

# Generate random DB password
DB_PASS=$(python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20)))")

mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'voting_admin'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON voting_system.* TO 'voting_admin'@'localhost';
FLUSH PRIVILEGES;
EOF

echo "  MySQL user: voting_admin"
echo "  MySQL pass: ${DB_PASS}  (save this!)"
echo "${DB_PASS}" > /root/db_password.txt

# ── Setup backend ──────────────────────────────────────────────────────────
echo "[4/8] Setting up backend..."
mkdir -p /opt/votesecure
cp -r backend /opt/votesecure/
cd /opt/votesecure/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# Generate secrets
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
AES_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# Create systemd service
cat > /etc/systemd/system/votesecure-backend.service <<SVC
[Unit]
Description=VoteSecure Flask Backend
After=network.target mysql.service

[Service]
User=root
WorkingDirectory=/opt/votesecure/backend
Environment="DB_HOST=localhost"
Environment="DB_USER=voting_admin"
Environment="DB_PASSWORD=${DB_PASS}"
Environment="DB_NAME=voting_system"
Environment="SECRET_KEY=${SECRET_KEY}"
Environment="JWT_SECRET_KEY=${JWT_SECRET}"
Environment="AES_KEY=${AES_KEY}"
Environment="ADMIN_EMAIL=admin@votingsystem.com"
Environment="ADMIN_PASSWORD=Admin@123!"
ExecStart=/opt/votesecure/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 app:create_app\(\) --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable votesecure-backend
systemctl start votesecure-backend

echo "  Backend running on port 8000"

# ── Setup frontend ─────────────────────────────────────────────────────────
echo "[5/8] Building frontend..."
cd /opt/votesecure
cp -r ../src ../public ../package.json ../vite.config.ts ../tsconfig.json ../index.html . 2>/dev/null || true

# If running from repo root:
if [ -f /opt/votesecure/../package.json ]; then
    cd /opt/votesecure/..
    npm install
    npm run build
    mkdir -p /var/www/votesecure
    cp -r dist/* /var/www/votesecure/
else
    echo "  Frontend files not found — copy the built dist/ folder to /var/www/votesecure/"
fi

# ── Configure Nginx ────────────────────────────────────────────────────────
echo "[6/8] Configuring Nginx..."
cat > /etc/nginx/sites-available/votesecure <<'NGX'
server {
    listen 80;
    server_name _;

    root /var/www/votesecure;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 2M;
}
NGX

ln -sf /etc/nginx/sites-available/votesecure /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# ── Firewall ───────────────────────────────────────────────────────────────
echo "[7/8] Configuring firewall..."
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# ── Done ───────────────────────────────────────────────────────────────────
echo "[8/8] Setup complete!"
echo ""
echo "============================================"
echo " VoteSecure is running!"
echo "============================================"
echo ""
echo "  URL: http://$(curl -s ifconfig.me)"
echo ""
echo "  Backend logs: journalctl -u votesecure-backend -f"
echo "  Nginx logs:   tail -f /var/log/nginx/access.log"
echo "  DB password:  /root/db_password.txt"
echo ""
echo "  Run HTTPS setup:"
echo "    certbot --nginx -d YOUR_DOMAIN"
echo "============================================"
