import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.database import get_db
from services.auth_service import hash_password, verify_password, create_access_token
from services.validators import (
    validate_aadhaar, validate_phone, validate_email,
    validate_name, validate_password, validate_salary
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Pydantic models ────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterClientRequest(BaseModel):
    name: str
    phone: str
    email: str
    aadhaar_no: str
    password: str

class RegisterManagerRequest(BaseModel):
    name: str
    email: str
    phone_number: str
    aadhaarNo: str
    hire_date: str
    base_salary: float
    password: str

class RegisterAgentRequest(BaseModel):
    manager_id: str
    name: str
    phone: str
    email: str
    hire_date: str
    base_salary: float
    password: str


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.post("/login")
def login(req: LoginRequest, conn=Depends(get_db)):
    email = req.email.strip().lower()
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM AUTH_USERS WHERE email=%s", (email,))
        user = cur.fetchone()
    if not user or not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    token = create_access_token({
        "sub": user["user_id"],
        "email": user["email"],
        "role": user["role"],
        "name": user["display_name"],
    })
    return {
        "access_token": token,
        "token_type": "bearer",
        "role": user["role"],
        "user_id": user["user_id"],
        "name": user["display_name"],
    }


@router.post("/register/client")
def register_client(req: RegisterClientRequest, conn=Depends(get_db)):
    # Validate all fields
    name      = validate_name(req.name)
    email     = validate_email(req.email)
    phone     = validate_phone(req.phone)
    aadhaar   = validate_aadhaar(req.aadhaar_no)
    password  = validate_password(req.password)

    client_id = f"C-{uuid.uuid4().hex[:6].upper()}"
    pw_hash   = hash_password(password)
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO CLIENT(client_id,name,phone,email,aadhaar_no) VALUES(%s,%s,%s,%s,%s)",
                (client_id, name, phone, email, aadhaar)
            )
            cur.execute(
                "INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES(%s,%s,%s,'client',%s)",
                (client_id, email, pw_hash, name)
            )
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Client registered successfully.", "client_id": client_id}


@router.post("/register/manager")
def register_manager(req: RegisterManagerRequest, conn=Depends(get_db)):
    name     = validate_name(req.name)
    email    = validate_email(req.email)
    phone    = validate_phone(req.phone_number)
    aadhaar  = validate_aadhaar(req.aadhaarNo, "Aadhaar (Manager)")
    salary   = validate_salary(req.base_salary)
    password = validate_password(req.password)

    manager_id = f"M-{uuid.uuid4().hex[:6].upper()}"
    pw_hash    = hash_password(password)
    try:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO MANAGER(manager_id,name,email,phone_number,aadhaarNo,hire_date,base_salary,active_flag)
                   VALUES(%s,%s,%s,%s,%s,%s,%s,1)""",
                (manager_id, name, email, phone, aadhaar, req.hire_date, salary)
            )
            cur.execute(
                "INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES(%s,%s,%s,'manager',%s)",
                (manager_id, email, pw_hash, name)
            )
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Manager registered successfully.", "manager_id": manager_id}


@router.post("/register/agent")
def register_agent(req: RegisterAgentRequest, conn=Depends(get_db)):
    name     = validate_name(req.name)
    email    = validate_email(req.email)
    phone    = validate_phone(req.phone)
    salary   = validate_salary(req.base_salary)
    password = validate_password(req.password)

    agent_id = f"A-{uuid.uuid4().hex[:6].upper()}"
    pw_hash  = hash_password(password)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM MANAGER WHERE manager_id=%s AND active_flag=1", (req.manager_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=400, detail="Manager not found or inactive.")
            cur.execute(
                """INSERT INTO AGENT(agent_id,manager_id,name,phone,email,hire_date,active_flag,base_salary)
                   VALUES(%s,%s,%s,%s,%s,%s,1,%s)""",
                (agent_id, req.manager_id, name, phone, email, req.hire_date, salary)
            )
            cur.execute(
                "INSERT INTO AUTH_USERS(user_id,email,password_hash,role,display_name) VALUES(%s,%s,%s,'agent',%s)",
                (agent_id, email, pw_hash, name)
            )
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Agent registered successfully.", "agent_id": agent_id}
