#!/usr/bin/env bash
# =============================================================================
# VoteSecure - One-Command Local Runner
# Usage: ./run.sh [--fresh-db] [--skip-frontend] [--skip-backend] [--help]
# =============================================================================
set -e

# ─── Configuration ───────────────────────────────────────────────────────────
DB_NAME="voting_system"
DB_USER="voting_admin"
DB_PASS="V0t1ngS3cur3!"
DB_HOST="localhost"
DB_PORT="3306"
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# ─── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; CYAN='\033[0;36m'; NC='\033[0m'
BOLD='\033[1m'

banner() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}🗳️   VoteSecure - Electronic Voting System${NC}                   ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  ${CYAN}React + Flask + MySQL + AES-256${NC}                           ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

help_msg() {
    echo "Usage: ./run.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --fresh-db       Drop and recreate the database (destroys all data!)"
    echo "  --skip-frontend  Don't start the React frontend"
    echo "  --skip-backend   Don't start the Flask backend"
    echo "  --setup-only     Only setup DB and install dependencies, don't run"
    echo "  --help           Show this message"
    echo ""
    echo "Examples:"
    echo "  ./run.sh                    # Full setup + run everything"
    echo "  ./run.sh --fresh-db         # Wipe DB, reseed, and run"
    echo "  ./run.sh --setup-only       # Just install deps and set up DB"
    exit 0
}

# ─── Parse flags ─────────────────────────────────────────────────────────────
FRESH_DB=false; SKIP_FRONTEND=false; SKIP_BACKEND=false; SETUP_ONLY=false
for arg in "$@"; do
    case $arg in
        --fresh-db)    FRESH_DB=true ;;
        --skip-frontend) SKIP_FRONTEND=true ;;
        --skip-backend)  SKIP_BACKEND=true ;;
        --setup-only)  SETUP_ONLY=true ;;
        --help)        help_msg ;;
    esac
done

# ─── Step 1: Check prerequisites ─────────────────────────────────────────────
step1() {
    echo -e "${YELLOW}[1/6] Checking prerequisites...${NC}"
    local ok=true

    command -v python3 >/dev/null 2>&1 || { echo -e "  ${RED}✗ python3 missing${NC}"; ok=false; }
    command -v node    >/dev/null 2>&1 || { echo -e "  ${RED}✗ node missing${NC}";    ok=false; }
    command -v npm     >/dev/null 2>&1 || { echo -e "  ${RED}✗ npm missing${NC}";     ok=false; }
    command -v mysql   >/dev/null 2>&1 || { echo -e "  ${RED}✗ mysql client missing${NC}"; ok=false; }

    if ! $ok; then
        echo -e "${RED}Please install missing prerequisites and try again.${NC}"
        exit 1
    fi

    # Check if MySQL is running
    if ! mysqladmin ping -h "$DB_HOST" -u root --silent 2>/dev/null; then
        echo -e "  ${YELLOW}⚠ MySQL doesn't appear to be running on $DB_HOST:$DB_PORT${NC}"
        echo -e "  ${YELLOW}  Attempting to continue anyway...${NC}"
    fi

    echo -e "${GREEN}  ✓ All tools found${NC}"
}

# ─── Step 2: Database setup ──────────────────────────────────────────────────
step2() {
    echo -e "${YELLOW}[2/6] Setting up MySQL database...${NC}"

    # Check if DB already exists
    local db_exists=$(mysql -u root -h "$DB_HOST" --skip-column-names -e \
        "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME='$DB_NAME'" 2>/dev/null || echo "")

    if [ "$FRESH_DB" = true ] && [ -n "$db_exists" ]; then
        echo -e "  ${YELLOW}--fresh-db: dropping existing database...${NC}"
        mysql -u root -h "$DB_HOST" -e "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
        db_exists=""
    fi

    if [ -z "$db_exists" ]; then
        echo "  Running schema.sql..."
        mysql -u root -h "$DB_HOST" < schema.sql 2>/dev/null && \
            echo -e "${GREEN}  ✓ Database '$DB_NAME' created from schema.sql${NC}" || \
            { echo -e "${RED}  ✗ Failed to run schema.sql. Try: mysql -u root -p < schema.sql${NC}"; exit 1; }
    else
        echo -e "${GREEN}  ✓ Database '$DB_NAME' already exists (use --fresh-db to recreate)${NC}"
    fi
}

# ─── Step 3: Python virtual env + dependencies ────────────────────────────────
step3() {
    echo -e "${YELLOW}[3/6] Setting up Python backend...${NC}"

    cd backend

    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo "  Created virtual environment"
    fi

    # Activate (works on both Linux and macOS)
    source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

    echo "  Installing Python packages..."
    pip install -q -r requirements.txt

    echo -e "${GREEN}  ✓ Backend ready${NC}"
    cd ..
}

# ─── Step 4: Frontend dependencies ────────────────────────────────────────────
step4() {
    echo -e "${YELLOW}[4/6] Setting up React frontend...${NC}"

    if [ ! -d "node_modules" ]; then
        npm install --silent
    else
        echo "  node_modules already exists, skipping npm install"
    fi

    echo -e "${GREEN}  ✓ Frontend ready${NC}"
}

# ─── Step 5: Verify setup ────────────────────────────────────────────────────
step5() {
    echo -e "${YELLOW}[5/6] Verifying...${NC}"

    # Quick Python import check
    cd backend && source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
    python3 -c "from app import create_app; from models import *; print('  ✓ Python imports OK')" || \
        echo -e "  ${YELLOW}⚠ Import check had issues (may be fine at runtime)${NC}"
    cd ..

    # Check frontend builds
    if command -v npx >/dev/null 2>&1; then
        npx tsc --noEmit --pretty 2>/dev/null && echo "  ✓ TypeScript OK" || \
            echo -e "  ${YELLOW}⚠ TypeScript check had warnings (build may still work)${NC}"
    fi

    echo -e "${GREEN}  ✓ Verification done${NC}"
}

# ─── Step 6: Start services ──────────────────────────────────────────────────
step6() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}               ${BOLD}🚀 Starting Services${NC}                           ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # ── Start Backend ──────────────────────────────────────────────────
    if [ "$SKIP_BACKEND" = false ]; then
        echo -e "${CYAN}Starting Flask backend on http://localhost:${BACKEND_PORT}${NC}"
        cd backend
        source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null

        # Set env vars
        export FLASK_ENV=development
        export DB_NAME="$DB_NAME"
        export DB_USER="$DB_USER"
        export DB_PASS="$DB_PASS"
        export DB_HOST="$DB_HOST"
        export DB_PORT="$DB_PORT"

        python3 app.py &
        BACKEND_PID=$!
        cd ..
        echo -e "${GREEN}  Backend PID: $BACKEND_PID${NC}"
    else
        echo -e "${YELLOW}  Skipping backend (--skip-backend)${NC}"
        BACKEND_PID=""
    fi

    # ── Start Frontend ─────────────────────────────────────────────────
    if [ "$SKIP_FRONTEND" = false ]; then
        echo -e "${CYAN}Starting React frontend on http://localhost:${FRONTEND_PORT}${NC}"
        npm run dev -- --host &
        FRONTEND_PID=$!
        echo -e "${GREEN}  Frontend PID: $FRONTEND_PID${NC}"
    else
        echo -e "${YELLOW}  Skipping frontend (--skip-frontend)${NC}"
        FRONTEND_PID=""
    fi

    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}✅ VoteSecure is running!${NC}                              ${BLUE}║${NC}"
    echo -e "${BLUE}╠══════════════════════════════════════════════════════════╣${NC}"
    echo -e "${BLUE}║${NC}                                                          ${BLUE}║${NC}"
    if [ "$SKIP_FRONTEND" = false ]; then
    echo -e "${BLUE}║${NC}  Frontend : ${GREEN}http://localhost:${FRONTEND_PORT}${NC}                       ${BLUE}║${NC}"
    fi
    if [ "$SKIP_BACKEND" = false ]; then
    echo -e "${BLUE}║${NC}  Backend  : ${GREEN}http://localhost:${BACKEND_PORT}${NC}                        ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  API Docs : ${GREEN}http://localhost:${BACKEND_PORT}/api/health${NC}             ${BLUE}║${NC}"
    fi
    echo -e "${BLUE}║${NC}                                                          ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  ${BOLD}Login Credentials:${NC}                                      ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Admin: ${CYAN}admin@votingsystem.com${NC} / ${CYAN}Admin@123!${NC}                ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Voter: ${CYAN}voter1@test.com${NC} / ${CYAN}Voter@123!${NC}                       ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  (100 voters: voter1..voter100@test.com)                  ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}                                                          ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}  Press ${BOLD}Ctrl+C${NC} to stop all services                    ${BLUE}║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # ── Cleanup on exit ────────────────────────────────────────────────
    cleanup() {
        echo ""
        echo -e "${YELLOW}Shutting down...${NC}"
        [ -n "$BACKEND_PID" ]  && kill "$BACKEND_PID"  2>/dev/null && echo "  Backend stopped"
        [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "  Frontend stopped"
        echo -e "${GREEN}Done.${NC}"
    }
    trap cleanup EXIT INT TERM

    # Wait for either process to exit
    if [ -n "$BACKEND_PID" ] && [ -n "$FRONTEND_PID" ]; then
        wait -n "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    elif [ -n "$BACKEND_PID" ]; then
        wait "$BACKEND_PID" 2>/dev/null || true
    elif [ -n "$FRONTEND_PID" ]; then
        wait "$FRONTEND_PID" 2>/dev/null || true
    fi
}

# ─── Main ────────────────────────────────────────────────────────────────────
banner

if [ "$1" = "--help" ]; then help_msg; fi

step1
step2
step3
step4
step5

if [ "$SETUP_ONLY" = true ]; then
    echo ""
    echo -e "${GREEN}✅ Setup complete! Run './run.sh' to start the application.${NC}"
    exit 0
fi

step6
