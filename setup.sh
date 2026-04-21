#!/bin/bash

set -e  # Exit on error

echo ""
echo "============================================================"
echo "      EstateHub - Real Estate DBMS  |  Linux Setup"
echo "============================================================"
echo ""

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"
SETUP_LOG="$LOG_DIR/setup.log"

echo "Setup started: $(date)" > "$SETUP_LOG"

echo "[1/7] Checking prerequisites..." | tee -a "$SETUP_LOG"

# Python check
if ! command -v python3 &> /dev/null; then
    echo "[ERROR] Python3 not found. Install Python 3.9+"
    exit 1
fi
echo "  Found: $(python3 --version)" | tee -a "$SETUP_LOG"

# Node check
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Install from https://nodejs.org"
    exit 1
fi
echo "  Found: $(node --version)" | tee -a "$SETUP_LOG"

# MySQL check
if ! command -v mysql &> /dev/null; then
    echo "[ERROR] MySQL not found. Install MySQL 8"
    exit 1
fi
echo "  Found: MySQL OK" | tee -a "$SETUP_LOG"

echo "[OK] All prerequisites found."
echo ""

# ── MySQL config ─────────────────────────────
echo "[2/7] MySQL Database Configuration"

read -p "   Host [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "   Port [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "   User [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -s -p "   Password: " DB_PASS
echo ""

read -p "   Database name [real_estate]: " DB_NAME
DB_NAME=${DB_NAME:-real_estate}

echo "   Testing connection..."

if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" -e "SELECT 1;" &>/dev/null; then
    echo "[ERROR] Cannot connect to MySQL."
    exit 1
fi

echo "[OK] MySQL connection successful."
echo ""

# ── Generate secret key ─────────────────────
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")

# ── Write .env ─────────────────────────────
echo "[3/7] Writing backend configuration..."

cat > "$BACKEND_DIR/.env" <<EOF
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASS
DB_NAME=$DB_NAME
SECRET_KEY=$SECRET_KEY
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
EOF

echo "[OK] .env written."
echo ""

# ── Load SQL ───────────────────────────────
echo "[4/7] Loading database..."

if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" < "$SCRIPTS_DIR/setup_db.sql" >> "$SETUP_LOG" 2>&1; then
    echo "[ERROR] Failed to load SQL. Check logs."
    exit 1
fi

echo "[OK] Database created and seeded."
echo ""

# ── Python venv ────────────────────────────
echo "[5/7] Setting up Python environment..."

cd "$BACKEND_DIR"

python3 -m venv venv
source venv/bin/activate

echo "   Installing Python packages..."
pip install --upgrade pip >> "$SETUP_LOG"
pip install -r requirements.txt >> "$SETUP_LOG"

deactivate

echo "[OK] Python environment ready."
echo ""

# ── Frontend ───────────────────────────────
echo "[6/7] Installing frontend packages..."

cd "$FRONTEND_DIR"

npm install --legacy-peer-deps >> "$SETUP_LOG"
npm install ajv@^8 --legacy-peer-deps >> "$SETUP_LOG"

echo "[OK] Frontend packages installed."
echo ""

# ── Logs dir ───────────────────────────────
echo "[7/7] Creating log directories..."

mkdir -p "$BACKEND_DIR/logs"

echo "[OK] Log directories ready."
echo ""

# ── Done ───────────────────────────────────
echo "Setup completed: $(date)" >> "$SETUP_LOG"

echo "============================================================"
echo "   Setup Complete! All steps passed successfully."
echo "============================================================"
echo ""
echo "Next step: run ./start.sh"
echo ""
echo "Login URL: http://localhost:3000"
echo "API Docs:  http://localhost:8000/docs"
echo "Setup log: $SETUP_LOG"
echo ""
echo "Demo password: password123"
echo "Admin:   admin@estate.com"
echo "Manager: anil.mgr@estate.com"
echo "Agent:   rahul.agt@estate.com"
echo "Client:  vikram@mail.com"
echo ""