#!/bin/bash

set -e

echo ""
echo "============================================================"
echo "        EstateHub - Starting Application"
echo "============================================================"

# Directories
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR/frontend"
LOG_DIR="$SCRIPT_DIR/logs"

mkdir -p "$LOG_DIR"
mkdir -p "$BACKEND_DIR/logs"

# ── Pre-flight checks ─────────────────────────────
if [ ! -f "$BACKEND_DIR/venv/bin/activate" ]; then
    echo "[ERROR] Virtual environment not found."
    echo "        Please run setup.sh first."
    exit 1
fi

if [ ! -f "$BACKEND_DIR/.env" ]; then
    echo "[ERROR] .env file not found in backend folder."
    echo "        Please run setup.sh first."
    exit 1
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "[ERROR] node_modules not found."
    echo "        Please run setup.sh first."
    exit 1
fi

echo ""
echo "  Starting backend  (FastAPI)  on  http://localhost:8000"
echo "  Starting frontend (React)    on  http://localhost:3000"
echo ""
echo "  Logs:"
echo "    Backend:  $BACKEND_DIR/logs/backend.log"
echo "    Access:   $BACKEND_DIR/logs/access.log"
echo "    Frontend: $LOG_DIR/frontend.log"
echo ""
echo "  API Docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo ""

# ── Start backend ─────────────────────────────
(
    cd "$BACKEND_DIR"
    source venv/bin/activate
    echo "Backend starting..."
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload \
        > "$BACKEND_DIR/logs/backend.log" 2>&1
) &

# Wait a bit for backend
sleep 4

# ── Start frontend ────────────────────────────
(
    cd "$FRONTEND_DIR"
    export BROWSER=none
    echo "Frontend compiling..."
    npm start > "$LOG_DIR/frontend.log" 2>&1
) &

echo "[OK] Both servers are starting in background."
echo ""
echo "Open your browser at: http://localhost:3000"
echo ""

# Wait for background processes
wait