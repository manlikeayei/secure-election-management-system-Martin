#!/bin/bash
# =============================================================================
# Voting System Deployment Script
# Deploys the Flask backend and React frontend with MySQL database
# =============================================================================

set -e

echo "============================================"
echo "  Voting System - Deployment Script"
echo "============================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration - customize these
DB_NAME="${DB_NAME:-voting_system}"
DB_USER="${DB_USER:-voting_admin}"
DB_PASSWORD="${DB_PASSWORD:-V0t1ngS3cur3!}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-3306}"
BACKEND_PORT="${BACKEND_PORT:-5000}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Check for required tools
check_requirements() {
    echo -e "\n${YELLOW}[1/6] Checking requirements...${NC}"
    
    command -v python3 >/dev/null 2>&1 || { echo -e "${RED}python3 is required${NC}"; exit 1; }
    command -v node >/dev/null 2>&1 || { echo -e "${RED}node is required${NC}"; exit 1; }
    command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required${NC}"; exit 1; }
    command -v mysql >/dev/null 2>&1 || { echo -e "${RED}mysql client is required${NC}"; exit 1; }
    
    echo -e "${GREEN}  ✓ All requirements met${NC}"
}

# Setup MySQL database
setup_database() {
    echo -e "\n${YELLOW}[2/6] Setting up MySQL database...${NC}"
    
    # Create database and user
    mysql -u root -p <<EOF || true
CREATE DATABASE IF NOT EXISTS ${DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'${DB_HOST}' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON ${DB_NAME}.* TO '${DB_USER}'@'${DB_HOST}';
FLUSH PRIVILEGES;
EOF
    
    echo -e "${GREEN}  ✓ Database '${DB_NAME}' ready${NC}"
}

# Setup Python backend
setup_backend() {
    echo -e "\n${YELLOW}[3/6] Setting up Python backend...${NC}"
    
    cd backend
    
    # Create virtual environment if not exists
    if [ ! -d "venv" ]; then
        python3 -m venv venv
        echo "  Created virtual environment"
    fi
    
    source venv/bin/activate
    
    # Install dependencies
    pip install -r requirements.txt
    
    echo -e "${GREEN}  ✓ Backend dependencies installed${NC}"
    
    # Set environment variables
    export DB_NAME=${DB_NAME}
    export DB_USER=${DB_USER}
    export DB_PASSWORD=${DB_PASSWORD}
    export DB_HOST=${DB_HOST}
    export DB_PORT=${DB_PORT}
    export FLASK_ENV=production
    
    cd ..
}

# Setup React frontend
setup_frontend() {
    echo -e "\n${YELLOW}[4/6] Setting up React frontend...${NC}"
    
    npm install
    
    echo -e "${GREEN}  ✓ Frontend dependencies installed${NC}"
}

# Build frontend
build_frontend() {
    echo -e "\n${YELLOW}[5/6] Building frontend...${NC}"
    
    npm run build
    
    echo -e "${GREEN}  ✓ Frontend built to dist/${NC}"
}

# Start services
start_services() {
    echo -e "\n${YELLOW}[6/6] Starting services...${NC}"
    
    echo ""
    echo "============================================"
    echo "  Starting Backend on port ${BACKEND_PORT}"
    echo "============================================"
    cd backend && source venv/bin/activate
    
    # Use gunicorn for production, flask for dev
    if [ "${ENV}" = "production" ]; then
        gunicorn -w 4 -b 0.0.0.0:${BACKEND_PORT} app:create_app() --timeout 120 &
    else
        python app.py &
    fi
    BACKEND_PID=$!
    cd ..
    
    echo ""
    echo "============================================"
    echo "  Deployment Complete!"
    echo "============================================"
    echo ""
    echo "  Backend:  http://localhost:${BACKEND_PORT}"
    echo "  Frontend: http://localhost:${FRONTEND_PORT}"
    echo ""
    echo "  Admin login: admin@votingsystem.com / Admin@123!"
    echo "  Voter login: voter1@test.com / Voter@123!"
    echo ""
    echo "  Press Ctrl+C to stop all services"
    echo "============================================"
    
    # Wait for background processes
    wait ${BACKEND_PID}
}

# Run tests
run_tests() {
    echo -e "\n${YELLOW}Running tests...${NC}"
    cd backend && source venv/bin/activate
    python -m pytest tests/ -v || true
    cd ..
    echo -e "${GREEN}  ✓ Tests completed${NC}"
}

# Main execution
case "${1:-all}" in
    db-only)
        setup_database
        ;;
    backend-only)
        setup_backend
        ;;
    frontend-only)
        setup_frontend
        build_frontend
        ;;
    test)
        setup_backend
        run_tests
        ;;
    all)
        check_requirements
        setup_database
        setup_backend
        setup_frontend
        build_frontend
        start_services
        ;;
    *)
        echo "Usage: $0 [all|db-only|backend-only|frontend-only|test]"
        echo "  all           - Full deployment (default)"
        echo "  db-only       - Setup database only"
        echo "  backend-only  - Install backend dependencies only"
        echo "  frontend-only - Install + build frontend only"
        echo "  test          - Run all tests"
        exit 1
        ;;
esac
