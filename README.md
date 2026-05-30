# 🗳️ Secure Voting System

A full-stack secure electronic voting platform built with **React**, **Flask**, **MySQL**, and **Tailwind CSS**, featuring AES-256 encryption, attribute-based access control, real-time results, and concurrent vote handling.

---

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Running Tests](#running-tests)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Test Data](#test-data)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

---

## ✨ Features

### Voter Functionality
- **Voter Registration** with personal data (SSN, address, phone encrypted with AES-256)
- **Secure Login** with email/password and JWT authentication
- **Vote Casting** with duplicate-prevention and concurrency handling
- **Eligibility Checking** based on assigned user attributes
- **View Election Results** after election ends
- **Voting History** tracking

### Admin Functionality
- **Election Management** — Create, update, delete elections
- **Participant Management** — Add/remove candidates
- **Attribute Management** — Create/delete custom attribute definitions
- **User Attribute Assignment** — Control which users can vote in which elections
- **Election Attribute Rules** — Set required attributes per election
- **Password Reset** for users
- **Admin Dashboard** with system statistics
- **Real-time Results** viewing at any time

### Attribute-Based Access Control
- Define custom attributes (e.g., department, region, clearance_level, membership_tier)
- Assign attributes to users
- Configure elections to require specific attribute values
- Support for "match ANY" or "match ALL" attribute modes
- **100 test users** pre-loaded with diverse attributes

### Security
- **AES-256-GCM encryption** for all sensitive PII data
- **bcrypt password hashing** with salt
- **JWT-based authentication** with expiration
- **Vote integrity hashing** (SHA-256) to prevent tampering
- **Duplicate vote prevention** with unique constraints
- **Admin-only** sensitive operations

### Real-Time & Performance
- **Concurrent vote handling** with retry logic (up to 3 attempts)
- **Real-time election results** computation
- **Threaded Flask server** for concurrent requests
- **Paginated user listing**

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CLIENT (React + Tailwind)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │  Login/  │ │  Voter   │ │  Admin   │ │   Election    │ │
│  │ Register │ │ Dashboard│ │  Panel   │ │   Results     │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘ │
│       │             │             │               │         │
└───────┼─────────────┼─────────────┼───────────────┼─────────┘
        │             │             │               │
        ▼             ▼             ▼               ▼
┌─────────────────────────────────────────────────────────────┐
│                   REST API (Flask + Blueprints)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │ /api/auth│ │/api/votes│ │/api/admin│ │/api/elections │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └───────┬───────┘ │
│       │             │             │               │         │
│  ┌────┴─────────────┴─────────────┴───────────────┴───────┐ │
│  │              Middleware Layer                           │ │
│  │   • JWT Authentication (require_auth, require_admin)    │ │
│  │   • AES-256 Encryption/Decryption (crypto_utils)        │ │
│  │   • Input Validation & Sanitization                     │ │
│  └──────────────────────────┬─────────────────────────────┘ │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MySQL Database                          │
│  ┌───────┐ ┌──────────┐ ┌───────┐ ┌──────────────────────┐ │
│  │ users │ │elections │ │ votes │ │attribute_definitions │ │
│  └───┬───┘ └────┬─────┘ └───┬───┘ └──────────┬───────────┘ │
│      │          │            │                │             │
│  ┌───┴──────────┴────────────┴────────────────┴───────────┐ │
│  │ user_attributes    election_attributes   participants  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Database Schema

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Voter/Admin accounts | email, password_hash, encrypted_ssn, encrypted_address, encrypted_phone |
| `elections` | Election definitions | name, election_type, start_date, end_date, require_all_attributes |
| `participants` | Candidates/Options | name, party, bio, election_id |
| `votes` | Cast votes | user_id, election_id, participant_id, vote_hash |
| `attribute_definitions` | Custom attribute types | name, display_name, description |
| `user_attributes` | User-to-attribute mapping | user_id, attribute_id, value |
| `election_attributes` | Required election attributes | election_id, attribute_id, required_value |

### Data Flow

```
1. Admin creates attribute definitions (e.g., "department")
2. Admin assigns attributes to users (e.g., "Engineering")
3. Admin creates election with required attributes
4. Voter logs in → system checks eligibility by matching user attributes against election attributes
5. Eligible voter casts vote → system validates, checks duplicates (3 retries), records vote
6. Admin or voter views results → system computes real-time totals and percentages
```

---

## 🛠️ Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Frontend** | React | 19.2 |
| | Tailwind CSS | 4.1 |
| | Vite | 7.3 |
| | TypeScript | 5.9 |
| **Backend** | Python | 3.10+ |
| | Flask | 3.1 |
| | SQLAlchemy | 3.1 |
| | PyJWT | 2.10 |
| | bcrypt | 4.3 |
| **Database** | MySQL | 8.0+ |
| | PyMySQL | 1.1 |
| **Security** | AES-256-GCM (cryptography) | 45.0 |
| **Testing** | pytest | Latest |
| **Deployment** | gunicorn | 23.0 |

---

## 📦 Prerequisites

- **Python 3.10+** with pip
- **Node.js 18+** with npm
- **MySQL 8.0+** running on localhost:3306
- **Bash** (Linux/Mac) or **Command Prompt** (Windows)

---

## 🚀 Quick Start

### ⚡ One-Command Start (Recommended)

**Linux / macOS:**
```bash
chmod +x run.sh
./run.sh                    # Full setup + start
./run.sh --fresh-db         # Wipe DB, reseed, start
./run.sh --help             # All options
```

**Windows:**
```cmd
run.bat                     # Full setup + start
run.bat --fresh-db          # Wipe DB, reseed, start
run.bat --help              # All options
```

This single script:
1. Checks prerequisites (python3, node, npm, mysql)
2. Creates the MySQL database from `schema.sql`
3. Sets up Python virtual environment and installs dependencies
4. Installs frontend npm packages
5. Verifies everything works
6. Starts both the Flask backend (port 5000) and React frontend (port 5173)
7. Database is auto-seeded with 100 test users, 5 elections, and 6 attribute types on first backend start

---

### 🐢 Manual Setup (Step by Step)

#### 1. Database

```bash
# Run the schema file directly:
mysql -u root -p < schema.sql
```

Or manually:
```sql
CREATE DATABASE voting_system CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'voting_admin'@'localhost' IDENTIFIED BY 'V0t1ngS3cur3!';
GRANT ALL PRIVILEGES ON voting_system.* TO 'voting_admin'@'localhost';
FLUSH PRIVILEGES;
```

#### 2. Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Linux/Mac
# OR: venv\Scripts\activate    # Windows

pip install -r requirements.txt
python app.py
```

The backend starts on **http://localhost:5000**. On first run, it automatically seeds 100 test users + sample elections.

#### 3. Frontend

```bash
npm install
npm run dev
```

The frontend starts on **http://localhost:5173**.

### 🔑 Login

| Role | Email | Password |
|------|-------|----------|
| **Admin** | admin@votingsystem.com | Admin@123! |
| **Voter** | voter1@test.com | Voter@123! |
| **Voter** | voter2@test.com | Voter@123! |
| ... | voter100@test.com | Voter@123! |

---

## 📖 Detailed Setup

### Database Configuration

Edit `backend/config.py` or set environment variables:

```bash
export DB_USER=voting_admin
export DB_PASSWORD=V0t1ngS3cur3!
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=voting_system
export AES_KEY=your-32-byte-hex-key-here-change-in-production
```

### Backend Endpoints

The backend exposes REST APIs at:

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Register new voter |
| POST | `/api/auth/login` | None | Login |
| GET | `/api/auth/me` | Voter | Get current user |
| POST | `/api/auth/reset-password` | Admin | Reset user password |
| GET | `/api/elections` | Voter | List elections (with eligibility) |
| POST | `/api/elections` | Admin | Create election |
| PUT | `/api/elections/<id>` | Admin | Update election |
| DELETE | `/api/elections/<id>` | Admin | Delete election |
| GET | `/api/elections/<id>/results` | Voter | Get results |
| POST | `/api/elections/<id>/participants` | Admin | Add participant |
| DELETE | `/api/elections/<id>/participants/<pid>` | Admin | Remove participant |
| POST | `/api/votes/cast` | Voter | Cast vote |
| GET | `/api/votes/my-votes` | Voter | My voting history |
| GET | `/api/votes/election/<id>/count` | Voter | Real-time counts |
| GET | `/api/admin/dashboard` | Admin | System statistics |
| GET | `/api/admin/users` | Admin | List users |
| PUT | `/api/admin/users/<id>` | Admin | Update user |
| DELETE | `/api/admin/users/<id>` | Admin | Delete user |
| POST | `/api/admin/users/<id>/attributes` | Admin | Assign user attribute |
| GET | `/api/attributes` | Voter | List attribute definitions |
| POST | `/api/attributes` | Admin | Create attribute |
| PUT | `/api/attributes/<id>` | Admin | Update attribute |
| DELETE | `/api/attributes/<id>` | Admin | Delete attribute |

---

## 🧪 Running Tests

```bash
cd backend
source venv/bin/activate
python -m pytest tests/ -v
```

Test modules:
- `test_auth.py` — Login, registration, password validation, token generation
- `test_elections.py` — CRUD operations, authorization, participant management
- `test_votes.py` — Vote casting, duplicate prevention, results computation
- `test_attributes.py` — Attribute CRUD, uniqueness constraints
- `test_crypto.py` — AES-256 encryption/decryption, hash integrity

---

## 🔒 Security

### AES-256 Encryption
All sensitive PII (SSN, address, phone) is encrypted using **AES-256-GCM** (Galois/Counter Mode) which provides both confidentiality and authenticity:

- **256-bit key** derived from configured key material using SHA-256
- **96-bit random IV** per encryption (generated via `os.urandom(12)`)
- **GCM authentication tag** verifies ciphertext integrity
- **Base64 encoding** for safe storage in MySQL TEXT columns

### Password Security
- **bcrypt** with auto-generated salts (12 rounds)
- Passwords never stored in plaintext
- Enforced complexity: 8+ chars, uppercase, lowercase, digit, special character

### API Security
- **JWT tokens** with HS256 signing and 6-hour expiration
- **Admin-only decorators** (`@require_admin`) on sensitive endpoints
- **Vote integrity hash** (SHA-256) stored with each vote

### Database
- Unique constraint on `(user_id, election_id)` prevents double-voting at DB level
- Foreign key constraints ensure referential integrity
- Indexed columns for query performance

---

## 📊 Test Data

The system seeds the following on first run:

### Users
- **1 Admin**: admin@votingsystem.com / Admin@123!
- **100 Voters**: voter1@test.com through voter100@test.com / Voter@123!
  - Random first/last names (gender-aligned via Faker)
  - Random dates of birth (18-90 years)
  - ~75% active, ~25% inactive
  - AES-256 encrypted SSN, address, phone

### Attributes (6 types)
| Attribute | Example Values |
|-----------|---------------|
| department | Engineering, Sales, Marketing, HR, Finance, Operations, Legal, IT |
| region | North, South, East, West, Central, Northeast, Southeast, Northwest |
| membership_tier | Basic, Silver, Gold, Platinum, Diamond |
| clearance_level | Public, Confidential, Secret, Top Secret |
| age_group | 18-25, 26-35, 36-45, 46-55, 56-65, 65+ |
| employment_status | Full-time, Part-time, Contract, Retired, Student |

### Elections (5 pre-configured)
1. **Board of Directors** — Requires Gold/Platinum/Diamond tier
2. **Engineering Department Lead** — Requires Engineering department
3. **Regional Council - Western** — Requires West region
4. **Company-wide Policy Referendum** — No restrictions (all eligible)
5. **Top Secret Clearance Committee** — Requires Top Secret clearance + match ALL mode

Each election has 2-6 randomly generated participants.

---

## 🚢 Deployment

### Linux/Mac

```bash
chmod +x deploy.sh
./deploy.sh          # Full deployment
./deploy.sh test     # Run tests only
./deploy.sh db-only  # Setup database only
```

### Windows

```cmd
deploy.bat
```

### Production Deployment

See **[DEPLOY.md](DEPLOY.md)** for detailed deployment guides to:

| Platform | Guide | Setup Script |
|----------|-------|-------------|
| Railway | One-click cloud deploy | `Procfile` |
| Render | Web service + static site | In-app config |
| DigitalOcean | Ubuntu Droplet | `deploy/do-setup.sh` |
| AWS EC2 | Amazon Linux 2 / Ubuntu | `deploy/aws-setup.sh` |
| Docker | docker-compose | `deploy/docker-compose.yml` |

**Quick Docker:**
```bash
docker-compose -f deploy/docker-compose.yml up -d
# Visit http://localhost
```

**Quick Gunicorn (single server):**
```bash
cd backend
gunicorn -w 4 -b 0.0.0.0:8000 "app:create_app()" --timeout 120
```

### Production Security Checklist
- [ ] Change `SECRET_KEY`, `JWT_SECRET_KEY`, `AES_KEY` via env vars
- [ ] Change `ADMIN_EMAIL` and `ADMIN_PASSWORD`
- [ ] Use strong `DB_PASSWORD`
- [ ] Enable HTTPS with certbot/Let's Encrypt
- [ ] Set up daily database backups
- [ ] Update `src/services/api.ts` with production backend URL before building

---

## 📁 Project Structure

```
voting-system/
├── README.md                    # This file
├── ARCHITECTURE.md              # Detailed architecture documentation
├── DEPLOY.md                    # 🚀 Deployment guides for Railway, Render, DO, AWS, Docker
├── schema.sql                   # MySQL schema (creates DB + all 7 tables)
├── run.sh                       # 🚀 One-command launcher (Linux/Mac)
├── run.bat                      # 🚀 One-command launcher (Windows)
├── Dockerfile.frontend          # Frontend Docker image
├── deploy/                      # Deployment scripts
│   ├── do-setup.sh              # DigitalOcean auto-setup
│   ├── aws-setup.sh             # AWS EC2 auto-setup
│   └── docker-compose.yml       # Full Docker stack
├── package.json                 # Frontend dependencies
├── vite.config.ts               # Vite configuration
├── tsconfig.json                # TypeScript configuration
├── index.html                   # Entry HTML
├── src/                         # React frontend source
│   ├── main.tsx                 # React entry point
│   ├── App.tsx                  # Root component with routing
│   ├── index.css                # Global styles + Tailwind
│   ├── utils/
│   │   └── cn.ts               # Utility for className merging
│   ├── components/              # Reusable UI components
│   │   ├── Layout.tsx           # App shell (navbar, sidebar)
│   │   ├── ProtectedRoute.tsx   # Auth guard component
│   │   └── ...
│   ├── contexts/
│   │   └── AuthContext.tsx      # Auth state management
│   ├── pages/
│   │   ├── Login.tsx            # Login page
│   │   ├── Register.tsx         # Voter registration
│   │   ├── Dashboard.tsx        # Voter dashboard
│   │   ├── Elections.tsx        # Election listing + voting
│   │   ├── Results.tsx          # Results display
│   │   ├── AdminDashboard.tsx   # Admin overview
│   │   ├── AdminUsers.tsx       # User management
│   │   ├── AdminElections.tsx   # Election CRUD
│   │   ├── AdminAttributes.tsx  # Attribute management
│   │   └── MyVotes.tsx          # Vote history
│   └── services/
│       └── api.ts              # API client with Axios
│
└── backend/                     # Python Flask backend
    ├── Dockerfile               # Backend Docker image
    ├── requirements.txt         # Python dependencies
    ├── config.py                # Configuration (DB, AES key, JWT)
    ├── extensions.py            # Shared SQLAlchemy instance
    ├── app.py                   # Flask application factory
    ├── models.py                # SQLAlchemy models + seed data
    ├── crypto_utils.py          # AES-256 encryption utilities
    ├── auth_utils.py            # JWT + decorators
    ├── routes/
    │   ├── __init__.py
    │   ├── auth.py              # Authentication routes
    │   ├── elections.py         # Election management
    │   ├── votes.py             # Vote casting
    │   ├── admin.py             # Admin operations
    │   └── attributes.py        # Attribute management
    └── tests/
        ├── __init__.py
        ├── test_auth.py         # Auth tests
        ├── test_elections.py    # Election tests
        ├── test_votes.py        # Voting tests
        ├── test_attributes.py   # Attribute tests
        └── test_crypto.py       # Encryption tests
```

---

## 📄 License

This project is provided as-is for educational and demonstration purposes.

---

## 🤝 Support

For issues, please check:
1. MySQL is running on port 3306
2. Backend is running on port 5000
3. Frontend is running on port 5173
4. Database credentials match in `backend/config.py` and MySQL setup
