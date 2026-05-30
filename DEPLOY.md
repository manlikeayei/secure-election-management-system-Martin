# 🚀 Deployment Guide — VoteSecure

This guide covers deploying VoteSecure (Flask + React + MySQL) to popular cloud platforms.

---

## 📋 Architecture Overview (Production)

```
                        ┌──────────────┐
                        │   Internet   │
                        └──────┬───────┘
                               │ HTTPS :443
                               ▼
                        ┌──────────────┐
                        │  Nginx / CDN │ ← React static build
                        └──────┬───────┘
                               │ /api/*
                               ▼
                    ┌──────────────────┐
                    │  Gunicorn :8000  │ ← Flask (4 workers)
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  MySQL / RDS     │
                    └──────────────────┘
```

---

## 🔧 Option 1: Deploy to Railway (Easiest)

Railway runs both the backend and database with minimal config.

### 1. Prepare

```bash
# Add a Procfile in the backend folder
echo "web: gunicorn -w 4 -b 0.0.0.0:\${PORT:-8000} app:create_app() --timeout 120" > backend/Procfile

# Add a runtime.txt
echo "python-3.11.9" > backend/runtime.txt
```

### 2. Environment Variables (set in Railway dashboard)

| Variable | Value |
|----------|-------|
| `DB_HOST` | Railway MySQL host |
| `DB_PORT` | `3306` |
| `DB_USER` | Railway MySQL user |
| `DB_PASSWORD` | Railway MySQL password |
| `DB_NAME` | `railway` |
| `SECRET_KEY` | Generate a random 64-char string |
| `JWT_SECRET_KEY` | Generate another random 64-char string |
| `AES_KEY` | 64-char hex string (32 bytes) |
| `ADMIN_EMAIL` | Your admin email |
| `ADMIN_PASSWORD` | Strong admin password |

### 3. Deploy

- Connect your GitHub repo to Railway
- Set the root directory to `backend/`
- Railway auto-detects Python + Procfile

### 4. Frontend (Vercel/Netlify)

```bash
# Build locally or in CI
npm run build
# Deploy dist/ folder to Vercel or Netlify
# Set the API base URL in src/services/api.ts before building:
# const API_BASE = 'https://your-railway-app.up.railway.app/api';
```

---

## 🔧 Option 2: Deploy to Render

### Backend (Web Service)

1. Create a new Web Service on Render
2. Connect your repo
3. Settings:
   - **Root Directory**: `backend/`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn -w 4 -b 0.0.0.0:$PORT app:create_app() --timeout 120`

### Database (Render PostgreSQL or external MySQL)

If using Render's built-in PostgreSQL, add `psycopg2-binary` to requirements.txt and update the DB URI:

```python
# config.py
SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL', 'mysql+pymysql://...')
```

### Frontend (Static Site)

1. Create another Render service → Static Site
2. **Build Command**: `npm install && npm run build`
3. **Publish Directory**: `dist/`
4. Update `src/services/api.ts` with your Render backend URL before building

---

## 🔧 Option 3: Deploy to DigitalOcean Droplet

### 1. Provision a Droplet

```bash
# Ubuntu 22.04 LTS, at least 1 GB RAM
ssh root@YOUR_DROPLET_IP
```

### 2. Run the setup script

```bash
# Copy deploy/do-setup.sh to the droplet, then:
chmod +x do-setup.sh
./do-setup.sh
```

### 3. Configure Nginx

```nginx
# /etc/nginx/sites-available/votesecure
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    # React static files
    root /var/www/votesecure/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to Flask
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Upload size limit for photos
    client_max_body_size 2M;
}
```

```bash
sudo ln -s /etc/nginx/sites-available/votesecure /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 4. HTTPS with Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d YOUR_DOMAIN
```

---

## 🔧 Option 4: Deploy to AWS EC2

### 1. Launch EC2 Instance
- Amazon Linux 2 or Ubuntu 22.04
- t3.small (2 GB RAM recommended)
- Security group: open ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. SSH in and run setup

```bash
ssh -i your-key.pem ec2-user@YOUR_EC2_IP
# Copy deploy/aws-setup.sh and run it
chmod +x aws-setup.sh
./aws-setup.sh
```

### 3. RDS for MySQL (optional, recommended for production)
- Create an RDS MySQL instance in the same VPC
- Update `DB_HOST` in config or env vars
- Ensure the EC2 security group can reach RDS on port 3306

---

## 🔧 Option 5: Docker Deployment

### Dockerfile (backend)

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

EXPOSE 8000
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:8000", "app:create_app()", "--timeout", "120"]
```

### Dockerfile (frontend)

```dockerfile
# Dockerfile (root)
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'
services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpass
      MYSQL_DATABASE: voting_system
      MYSQL_USER: voting_admin
      MYSQL_PASSWORD: V0t1ngS3cur3!
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DB_HOST: db
      DB_PORT: 3306
      DB_USER: voting_admin
      DB_PASSWORD: V0t1ngS3cur3!
      DB_NAME: voting_system
      SECRET_KEY: change-me-in-production
      JWT_SECRET_KEY: change-me-in-production
      AES_KEY: b7f8c9a1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8
      ADMIN_EMAIL: admin@votingsystem.com
      ADMIN_PASSWORD: Admin@123!
    depends_on:
      - db

  frontend:
    build: .
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

```bash
docker-compose up -d
# Visit http://localhost
```

---

## 📝 Pre-Deployment Checklist

- [ ] Change `SECRET_KEY` and `JWT_SECRET_KEY` in environment variables
- [ ] Change `AES_KEY` to a new random 64-character hex string
- [ ] Change `ADMIN_EMAIL` and `ADMIN_PASSWORD` to strong values
- [ ] Set `DB_PASSWORD` to a strong password
- [ ] Update `src/services/api.ts` with the production backend URL
- [ ] Run `npm run build` to generate production frontend
- [ ] Enable HTTPS (required for camera access in browsers)
- [ ] Set up database backups (daily mysqldump cron)
- [ ] Configure firewall to only expose ports 80 and 443

---

## 🔐 Generate Secure Keys

```bash
# Generate a random 64-char hex AES key
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate a random secret key
python3 -c "import secrets; print(secrets.token_hex(32))"

# Generate strong admin password
python3 -c "import secrets, string; chars = string.ascii_letters + string.digits + '!@#$%^&*'; print(''.join(secrets.choice(chars) for _ in range(16)))"
```
