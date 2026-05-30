#!/usr/bin/env bash
# =============================================================================
# AWS EC2 Setup Script — VoteSecure
# For Amazon Linux 2 or Ubuntu 22.04
# Usage: ./aws-setup.sh
# =============================================================================
set -e

echo "============================================"
echo " VoteSecure — AWS EC2 Setup"
echo "============================================"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    OS="unknown"
fi

# ── Install dependencies ───────────────────────────────────────────────────
echo "[1/7] Installing dependencies..."

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2
    yum update -y
    yum install -y python3 python3-pip nginx mysql-server git
    yum install -y gcc python3-devel
    curl -sL https://rpm.nodesource.com/setup_20.x | bash -
    yum install -y nodejs
    systemctl start mysqld
else
    # Ubuntu
    apt update -y && apt upgrade -y
    apt install -y python3 python3-pip python3-venv nginx mysql-server \
        nodejs npm git
    systemctl start mysql
fi

# ── Setup MySQL ────────────────────────────────────────────────────────────
echo "[2/7] Setting up MySQL..."
DB_PASS=$(python3 -c "import secrets, string; print(''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(20)))")

if [ "$OS" = "amzn" ]; then
    # Amazon Linux 2 — get temp root password
    TEMP_PASS=$(sudo grep 'temporary password' /var/log/mysqld.log | tail -1 | awk '{print $NF}')
    mysql -u root -p"${TEMP_PASS}" --connect-expired-password <<EOF
ALTER USER 'root'@'localhost' IDENTIFIED BY 'RootP@ssw0rd!';
CREATE DATABASE IF NOT EXISTS voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'voting_admin'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON voting_system.* TO 'voting_admin'@'localhost';
FLUSH PRIVILEGES;
EOF
else
    mysql -u root <<EOF
CREATE DATABASE IF NOT EXISTS voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'voting_admin'@'localhost' IDENTIFIED BY '${DB_PASS}';
GRANT ALL PRIVILEGES ON voting_system.* TO 'voting_admin'@'localhost';
FLUSH PRIVILEGES;
EOF
fi

echo "${DB_PASS}" > /root/db_password.txt

# ── Setup backend ──────────────────────────────────────────────────────────
echo "[3/7] Setting up backend..."
mkdir -p /opt/votesecure/backend
cd /opt/votesecure/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt 2>/dev/null || pip install flask flask-cors flask-sqlalchemy pymysql cryptography bcrypt pyjwt marshmallow gunicorn
pip install gunicorn

python3 -c "import secrets; print('SECRET_KEY=' + secrets.token_hex(32))" > /opt/votesecure/env.conf
python3 -c "import secrets; print('JWT_SECRET_KEY=' + secrets.token_hex(32))" >> /opt/votesecure/env.conf
echo "DB_PASSWORD=${DB_PASS}" >> /opt/votesecure/env.conf
echo "ADMIN_EMAIL=admin@votingsystem.com" >> /opt/votesecure/env.conf
echo "ADMIN_PASSWORD=Admin@123!" >> /opt/votesecure/env.conf

# Systemd service
cat > /etc/systemd/system/votesecure-backend.service <<SVC
[Unit]
Description=VoteSecure Flask Backend
After=network.target

[Service]
User=root
WorkingDirectory=/opt/votesecure/backend
EnvironmentFile=/opt/votesecure/env.conf
ExecStart=/opt/votesecure/backend/venv/bin/gunicorn -w 4 -b 127.0.0.1:8000 app:create_app\(\) --timeout 120
Restart=always

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable votesecure-backend
systemctl start votesecure-backend

# ── Setup frontend ─────────────────────────────────────────────────────────
echo "[4/7] Setting up frontend..."
mkdir -p /var/www/votesecure
# Copy dist/ from local build or build here
# (In practice, build locally and scp the dist/ folder)

# ── Configure Nginx ────────────────────────────────────────────────────────
echo "[5/7] Configuring Nginx..."
cat > /etc/nginx/conf.d/votesecure.conf <<'NGX'
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

systemctl enable nginx
systemctl restart nginx

# ── Firewall ───────────────────────────────────────────────────────────────
echo "[6/7] Configuring security group..."
echo "  Make sure your EC2 security group allows:"
echo "    22 (SSH), 80 (HTTP), 443 (HTTPS)"

# ── Done ───────────────────────────────────────────────────────────────────
echo "[7/7] Setup complete!"
echo ""
echo "============================================"
echo " VoteSecure running on EC2!"
echo " Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 2>/dev/null || curl -s ifconfig.me)"
echo ""
echo " Backend logs: journalctl -u votesecure-backend -f"
echo " DB password saved at: /root/db_password.txt"
echo "============================================"
