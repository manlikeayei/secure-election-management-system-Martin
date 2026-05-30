# 🏗️ Voting System — Architecture Document

## High-Level Architecture

```
                              ┌──────────────────┐
                              │   Web Browser     │
                              │  (React + Tailwind)│
                              └────────┬─────────┘
                                       │ HTTP/REST + JWT
                                       ▼
                              ┌──────────────────┐
                              │   Nginx (optional)│
                              │  Reverse Proxy    │
                              │  Static Files     │
                              └────────┬─────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         ▼                           ▼
              ┌──────────────────┐        ┌──────────────────┐
              │  Flask REST API  │        │   React SPA      │
              │  (gunicorn)      │        │   (Vite build)   │
              │  Port 5000       │        │   Port 5173/80   │
              └────────┬─────────┘        └──────────────────┘
                       │
                       ▼
              ┌──────────────────┐
              │  MySQL 8.0       │
              │  Port 3306       │
              └──────────────────┘
```

---

## Component Architecture

### Frontend (React)

```
src/
├── App.tsx                    ← Root: Router + AuthProvider
├── contexts/
│   └── AuthContext.tsx         ← Global auth state (token, user, login/logout)
├── components/
│   ├── Layout.tsx              ← App shell with navigation
│   └── ProtectedRoute.tsx      ← Route guard (redirects to login)
├── pages/
│   ├── Login.tsx               ← Email/password form → POST /api/auth/login
│   ├── Register.tsx            ← Voter registration → POST /api/auth/register
│   ├── Dashboard.tsx           ← Voter: active elections, quick actions
│   ├── Elections.tsx           ← Browse elections, check eligibility, vote
│   ├── Results.tsx             ← View computed results with charts
│   ├── AdminDashboard.tsx      ← Stats cards, recent elections
│   ├── AdminElections.tsx      ← CRUD elections, manage participants/attributes
│   ├── AdminUsers.tsx          ← User list, edit, assign attributes, reset pwd
│   ├── AdminAttributes.tsx     ← Create/delete attribute definitions
│   └── MyVotes.tsx             ← Vote history for current user
└── services/
    └── api.ts                  ← Axios instance with JWT interceptor
```

**Component State Management Pattern:**
- `AuthContext` provides global auth state via React Context
- Each page manages its own local state with `useState`/`useEffect`
- API calls go through the centralized `api.ts` service
- JWT interceptor auto-attaches `Authorization: Bearer <token>` to all requests

### Backend (Flask)

```
backend/
├── app.py                     ← create_app() factory, blueprint registration
├── config.py                  ← Config class with all settings
├── models.py                  ← 7 SQLAlchemy models + init_db() seeder
├── crypto_utils.py            ← aes_encrypt(), aes_decrypt(), hash_sensitive_data()
├── auth_utils.py              ← generate_token(), require_auth, require_admin
├── routes/
│   ├── auth.py                ← /api/auth/* (login, register, reset-password)
│   ├── elections.py           ← /api/elections/* (CRUD, eligibility, results)
│   ├── votes.py               ← /api/votes/* (cast, my-votes, counts)
│   ├── admin.py               ← /api/admin/* (dashboard, users)
│   └── attributes.py          ← /api/attributes/* (CRUD)
└── tests/
    ├── test_auth.py
    ├── test_elections.py
    ├── test_votes.py
    ├── test_attributes.py
    └── test_crypto.py
```

**Request Flow:**

```
HTTP Request
    │
    ▼
Blueprint Route (@auth_bp.route)
    │
    ▼
Decorator (@require_auth / @require_admin)
    │
    ├── Extracts Bearer token from Authorization header
    ├── Decodes JWT → extracts user_id, is_admin
    ├── Sets request.current_user_id, request.is_admin
    │
    ▼
Route Handler Function
    │
    ├── Validates JSON body / query params
    ├── Executes business logic via SQLAlchemy
    ├── Calls crypto_utils for encryption/decryption
    │
    ▼
JSON Response + HTTP Status Code
```

---

## Database Design

### Entity-Relationship Diagram

```
┌──────────────────┐       ┌────────────────────────┐
│      users       │       │  attribute_definitions  │
├──────────────────┤       ├────────────────────────┤
│ id (PK)          │──┐    │ id (PK)                │──┐
│ email (UNIQUE)   │  │    │ name (UNIQUE)          │  │
│ password_hash    │  │    │ display_name           │  │
│ first_name       │  │    │ description            │  │
│ last_name        │  │    │ created_by (FK→users)  │  │
│ date_of_birth    │  │    │ created_at             │  │
│ encrypted_ssn    │  │    └────────────────────────┘  │
│ encrypted_addr   │  │                                │
│ encrypted_phone  │  │    ┌────────────────────────┐  │
│ is_admin         │  │    │   user_attributes      │  │
│ is_active        │  │    ├────────────────────────┤  │
│ created_at       │  ├───→│ id (PK)                │  │
│ updated_at       │  │    │ user_id (FK→users)     │  │
└──────────────────┘  │    │ attribute_id (FK→def)  │←─┘
       │               │    │ value                  │
       │               │    │ UNIQUE(user_id, attr)  │
       │               │    └────────────────────────┘
       │               │
       │               │    ┌────────────────────────┐
       │               │    │      elections         │
       │               │    ├────────────────────────┤
       │               └───→│ id (PK)                │←──┐
       │                    │ name                   │   │
       │                    │ election_type          │   │
       │                    │ description            │   │
       │                    │ start_date             │   │
       │                    │ end_date               │   │
       │                    │ is_active              │   │
       │                    │ require_all_attributes │   │
       │                    │ created_by (FK→users)  │   │
       │                    └────────────────────────┘   │
       │                           │                     │
       │              ┌────────────┼────────────┐        │
       │              ▼            ▼            ▼        │
       │   ┌──────────────┐ ┌──────────┐ ┌────────────────────┐
       │   │ participants │ │  votes   │ │election_attributes │
       │   ├──────────────┤ ├──────────┤ ├────────────────────┤
       │   │ id (PK)      │ │ id (PK)  │ │ id (PK)            │
       │   │ name         │ │ user_id  │─│ election_id       ─┤
       │   │ party        │ │ elect_id │─│ attribute_id      ─┘
       │   │ bio          │ │ part_id  │ │ required_value      │
       │   │ election_id──┘ │ vote_hash│ │ UNIQUE(elect,attr) │
       │   └──────────────┘ │ cast_at  │ └────────────────────┘
       │                    │ UNIQUE   │
       │                    │ (user,   │
       │                    │  elect)  │
       │                    └──────────┘
       │
       └───────────────── (all FKs cascade on delete)
```

### Key Design Decisions

1. **AES-256 encrypted columns** (`TEXT` type): SSN, address, phone are encrypted at rest using AES-256-GCM. The IV and authentication tag are prepended to the ciphertext before Base64 encoding.

2. **Vote integrity hash**: Each vote stores `vote_hash = SHA-256(user_id:election_id:participant_id:timestamp)` to detect tampering.

3. **Unique constraint on votes**: `UNIQUE(user_id, election_id)` prevents double-voting at the database level, not just application level.

4. **Attribute-based eligibility**: The `election_attributes` junction table defines which attributes and values are required. The `require_all_attributes` boolean on elections determines AND vs OR matching.

5. **Cascade deletes**: Deleting an election cascades to participants, votes, and election_attributes. Deleting an attribute definition cascades to all user and election attribute assignments.

---

## Security Architecture

### Encryption at Rest (AES-256-GCM)

```
                    ┌─────────────────┐
Plaintext ─────────→│ AES-256-GCM     │────→ IV (12B) + Tag (16B) + Ciphertext
                    │ Encrypt         │     └──────────┬──────────────────┘
  "123-45-6789"     │                 │                │
                    │ key = SHA-256   │         Base64 Encode
                    │ (config key)    │                │
                    │ iv = os.urandom │                ▼
                    │ (12)            │        MySQL TEXT column
                    └─────────────────┘

                    ┌─────────────────┐
MySQL TEXT ────────→│ Base64 Decode   │────→ IV (12B) + Tag (16B) + Ciphertext
                    └────────┬────────┘                  │
                             │                  ┌────────┴────────┐
                             │                  ▼                 ▼
                             │           AES-256-GCM         Verify Tag
                             │           Decrypt             (authenticity)
                             │                  │
                             ▼                  ▼
                         Plaintext: "123-45-6789"
```

### Authentication Flow

```
Client                              Server
  │                                    │
  │  POST /api/auth/login              │
  │  {email, password}                 │
  │ ──────────────────────────────────→│
  │                                    │ 1. Lookup user by email
  │                                    │ 2. bcrypt.checkpw(password, hash)
  │                                    │ 3. Generate JWT(user_id, is_admin, exp)
  │  {token, user}                     │
  │ ←──────────────────────────────────│
  │                                    │
  │  GET /api/elections                │
  │  Authorization: Bearer <token>     │
  │ ──────────────────────────────────→│
  │                                    │ 1. Extract token
  │                                    │ 2. jwt.decode(token, secret)
  │                                    │ 3. Verify expiration
  │                                    │ 4. Set request.current_user_id
  │  {elections: [...]}               │
  │ ←──────────────────────────────────│
```

### Concurrency Handling

```
┌──────────────────────────────────────────────────────────┐
│                  Vote Casting (POST /api/votes/cast)      │
│                                                          │
│  Thread 1          Thread 2          Thread 3            │
│     │                  │                  │              │
│     ▼                  ▼                  ▼              │
│  Check existing    Check existing    Check existing      │
│  vote (none)       vote (none)       vote (none)         │
│     │                  │                  │              │
│     ▼                  ▼                  ▼              │
│  INSERT vote ────→ UNIQUE constraint ──→ IntegrityError │
│  (SUCCESS)       (FAILS - Thread 2)   (FAILS - T3)      │
│                      │                  │              │
│                      ▼                  ▼              │
│                  Retry (0.1s)      Retry (0.1s)         │
│                      │                  │              │
│                      ▼                  ▼              │
│                  Check existing    Check existing       │
│                  vote (FOUND!)     vote (FOUND!)        │
│                      │                  │              │
│                      ▼                  ▼              │
│                  Return 409        Return 409           │
│                  "Already voted"   "Already voted"      │
│                                                          │
│  Max 3 retries with exponential backoff (0.1s, 0.2s,    │
│  0.3s) before definitively returning 409.                │
└──────────────────────────────────────────────────────────┘
```

---

## Attribute-Based Access Control System

### How Eligibility Works

```
ELECTION: "Engineering Department Lead"
  └── election_attributes:
      └── attribute: "department", value: "Engineering"

USER: voter42@test.com
  └── user_attributes:
      ├── department: "Engineering"  ✓ MATCH!
      ├── region: "West"
      └── membership_tier: "Gold"

RESULT: ELIGIBLE ✓

USER: voter17@test.com
  └── user_attributes:
      ├── department: "Sales"       ✗ NO MATCH
      ├── region: "North"
      └── membership_tier: "Basic"

RESULT: NOT ELIGIBLE ✗
```

### Match Modes

- **ANY mode** (default): User must match at least one election attribute requirement
- **ALL mode** (`require_all_attributes=True`): User must match every election attribute requirement

Example: "Top Secret Clearance Committee" uses ALL mode with `clearance_level=Top Secret`, ensuring only that specific group can participate.

---

## API Rate Limiting & Performance

### Database Indexes
- `users.email` — Fast login lookup
- `elections.name` — Search
- `attribute_definitions.name` — Quick name-based queries
- `uq_user_election_vote` — Prevents duplicate votes efficiently

### Query Optimization
- Pagination on user listing (50 per page default)
- Eager-loaded relationships where appropriate
- Results computed via SQL COUNT aggregation
- `SQLALCHEMY_ECHO=False` in production

### Threading
- Flask runs with `threaded=True` for concurrent request handling
- Gunicorn with 4 workers in production (configurable)
- SQLAlchemy connection pooling for efficient DB access

---

## Deployment Architecture (Production)

```
                    ┌──────────────┐
                    │   Internet   │
                    └──────┬───────┘
                           │ HTTPS :443
                           ▼
                    ┌──────────────┐
                    │  Nginx       │
                    │  (reverse    │
                    │   proxy)     │
                    └──┬───────┬───┘
                       │       │
              /api/*   │       │  / (static files)
                       ▼       ▼
              ┌──────────┐ ┌──────────┐
              │ Gunicorn │ │  Nginx   │
              │ :5000    │ │  static  │
              │ (4 workers)│ │  /dist/  │
              └────┬─────┘ └──────────┘
                   │
                   ▼
              ┌──────────┐
              │  MySQL   │
              │  :3306   │
              └──────────┘
```

---

## Testing Strategy

| Test Module | Type | Coverage |
|-------------|------|----------|
| `test_crypto.py` | Unit | AES encrypt/decrypt roundtrip, hashing, invalid data |
| `test_auth.py` | Integration | Login, register, password validation, token flow |
| `test_elections.py` | Integration | CRUD, authorization, eligibility checking |
| `test_votes.py` | Integration | Cast vote, duplicates, results calculation |
| `test_attributes.py` | Integration | CRUD, constraints, assignment |

All tests use SQLite in-memory database for isolation and speed.

---

## Extensibility Points

1. **New election types**: Add to `election_type` column, no code changes needed
2. **New attributes**: Create via API/UI, immediately available for assignment
3. **Custom eligibility rules**: Extend `_check_eligibility()` in `routes/elections.py`
4. **Additional encryption**: Add more encrypted fields to User model
5. **Notification system**: Hook into vote-cast event in `routes/votes.py`
6. **Audit logging**: Add middleware or event listeners for admin actions
