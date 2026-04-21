import logging
import logging.handlers
import os
import pymysql
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import auth, admin, manager, agent, client, properties

# ── Logging setup ─────────────────────────────────────────────────────────────
LOG_DIR = os.path.join(os.path.dirname(__file__), "logs")
os.makedirs(LOG_DIR, exist_ok=True)

def setup_logger(name: str, filename: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)
    fh = logging.handlers.RotatingFileHandler(
        os.path.join(LOG_DIR, filename),
        maxBytes=5 * 1024 * 1024,   # 5 MB
        backupCount=3,
        encoding="utf-8",
    )
    fh.setLevel(logging.DEBUG)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    fmt = logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s", "%Y-%m-%d %H:%M:%S")
    fh.setFormatter(fmt)
    ch.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger

app_logger  = setup_logger("app",    "backend.log")
access_logger = setup_logger("access","access.log")

# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="EstateHub — Real Estate DBMS API",
    description="Full-stack Real Estate Management System",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000"
    ], # Specify your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response logging middleware ─────────────────────────────────────
@app.middleware("http")
async def log_requests(request: Request, call_next):
    import time
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000, 1)
    access_logger.info(
        f"{request.method} {request.url.path} "
        f"status={response.status_code} {ms}ms"
    )
    return response

# ── Global exception handlers ─────────────────────────────────────────────────
@app.exception_handler(pymysql.err.IntegrityError)
async def integrity_error_handler(request: Request, exc: pymysql.err.IntegrityError):
    msg = str(exc.args[1]) if exc.args and len(exc.args) > 1 else str(exc)
    if "Duplicate entry" in msg:
        field = msg.split("for key '")[-1].rstrip("'")
        val   = msg.split("Duplicate entry '")[1].split("'")[0]
        clean = f"Value '{val}' already exists. Please use a different value ({field})."
        app_logger.warning(f"IntegrityError: {clean}")
        return JSONResponse(status_code=400, content={"detail": clean})
    app_logger.warning(f"IntegrityError: {msg}")
    return JSONResponse(status_code=400, content={"detail": msg})

@app.exception_handler(Exception)
async def generic_handler(request: Request, exc: Exception):
    app_logger.error(f"Unhandled error on {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": f"Internal server error: {str(exc)}"})

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(manager.router)
app.include_router(agent.router)
app.include_router(client.router)
app.include_router(properties.router)

@app.get("/", tags=["meta"])
def root():
    return {"message": "EstateHub Real Estate API is running 🏡", "docs": "/docs"}

@app.get("/health", tags=["meta"])
def health():
    from db.database import get_connection
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS c FROM AUTH_USERS")
            users = cur.fetchone()["c"]
        conn.close()
        app_logger.info("Health check: OK")
        return {"status": "ok", "db": "connected", "users": users}
    except Exception as e:
        app_logger.error(f"Health check failed: {e}")
        return {"status": "error", "db": str(e)}
