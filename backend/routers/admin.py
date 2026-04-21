import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from services.dependencies import require_role
from services.validators import (
    validate_aadhaar, validate_phone, validate_email,
    validate_name, validate_password, validate_salary
)

router = APIRouter(prefix="/admin", tags=["admin"])
admin_only = require_role("admin")


# ── Dashboard & Analytics ────────────────────────────────────────────────────

@router.get("/dashboard")
def dashboard(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) AS total FROM PROPERTY")
        props = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM CLIENT")
        clients = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM AGENT WHERE active_flag=1")
        agents = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM TRANSACTION")
        txns = cur.fetchone()["total"]
        cur.execute("SELECT COALESCE(SUM(sold_price),0) AS rev FROM TRANSACTION WHERE sold_price IS NOT NULL")
        revenue = cur.fetchone()["rev"]
        cur.execute("SELECT COUNT(*) AS total FROM LISTING WHERE status='ACTIVE'")
        active_listings = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM APPOINTMENT WHERE deal_status=0 AND schedule_date_time > NOW()")
        pending_apts = cur.fetchone()["total"]
        cur.execute("SELECT COUNT(*) AS total FROM MANAGER WHERE active_flag=1")
        managers = cur.fetchone()["total"]
    return {
        "total_properties": props, "total_clients": clients,
        "active_agents": agents, "total_transactions": txns,
        "total_revenue": float(revenue), "active_listings": active_listings,
        "pending_appointments": pending_apts, "active_managers": managers,
    }


@router.get("/analytics/sales-by-month")
def sales_by_month(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT DATE_FORMAT(sell_date,'%Y-%m') AS month,
                   COUNT(*) AS deals, COALESCE(SUM(sold_price),0) AS revenue
            FROM TRANSACTION WHERE sold_price IS NOT NULL
            GROUP BY month ORDER BY month
        """)
        return cur.fetchall()


@router.get("/analytics/sales-by-city")
def sales_by_city(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.city, COUNT(*) AS deals, COALESCE(SUM(t.sold_price),0) AS revenue
            FROM TRANSACTION t
            JOIN LISTING l ON t.listing_id=l.listing_id
            JOIN ADDRESS a ON l.property_id=a.property_id
            WHERE t.sold_price IS NOT NULL
            GROUP BY a.city ORDER BY revenue DESC
        """)
        return cur.fetchall()


@router.get("/analytics/top-agents")
def top_agents(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ag.agent_id, ag.name,
                   COUNT(t.transaction_id) AS total_deals,
                   COALESCE(SUM(t.sold_price),0) AS total_revenue,
                   SUM(CASE WHEN l.listing_type='RENT' THEN 1 ELSE 0 END) AS rent_deals,
                   SUM(CASE WHEN l.listing_type='SALE' THEN 1 ELSE 0 END) AS sale_deals
            FROM AGENT ag
            LEFT JOIN APPOINTMENT ap ON ag.agent_id=ap.agent_id
            LEFT JOIN TRANSACTION t ON ap.appointment_id=t.appointment_id
            LEFT JOIN LISTING l ON t.listing_id=l.listing_id
            GROUP BY ag.agent_id, ag.name ORDER BY total_revenue DESC
            
        """)
        return cur.fetchall()


@router.get("/analytics/rent-vs-sale")
def rent_vs_sale(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("SELECT listing_type, COUNT(*) AS count FROM LISTING GROUP BY listing_type")
        return cur.fetchall()


@router.get("/analytics/revenue-trend")
def revenue_trend(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT YEAR(sell_date) AS year,
                   COALESCE(SUM(sold_price),0) AS revenue, COUNT(*) AS deals
            FROM TRANSACTION WHERE sold_price IS NOT NULL
            GROUP BY year ORDER BY year
        """)
        return cur.fetchall()


@router.get("/analytics/property-type-dist")
def property_type_dist(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("SELECT property_type, COUNT(*) AS count FROM PROPERTY GROUP BY property_type")
        return cur.fetchall()


@router.get("/analytics/locality-activity")
def locality_activity(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT loc.locality_name, COUNT(p.property_id) AS properties,
                   COUNT(l.listing_id) AS listings
            FROM LOCALITY loc
            LEFT JOIN ADDRESS a ON loc.locality_id=a.locality_id
            LEFT JOIN PROPERTY p ON a.property_id=p.property_id
            LEFT JOIN LISTING l ON p.property_id=l.property_id
            GROUP BY loc.locality_id, loc.locality_name ORDER BY listings DESC
        """)
        return cur.fetchall()


# ── Managers ──────────────────────────────────────────────────────────────────

@router.get("/managers")
def list_managers(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT m.*, COUNT(a.agent_id) AS agent_count
            FROM MANAGER m
            LEFT JOIN AGENT a ON m.manager_id=a.manager_id AND a.active_flag=1
            GROUP BY m.manager_id ORDER BY m.hire_date DESC
        """)
        return cur.fetchall()


class AddManagerReq(BaseModel):
    name: str
    email: str
    phone_number: str
    aadhaarNo: str
    hire_date: str
    base_salary: float
    password: str


@router.post("/managers")
def add_manager(req: AddManagerReq, conn=Depends(get_db), user=Depends(admin_only)):
    from services.auth_service import hash_password
    name     = validate_name(req.name)
    email    = validate_email(req.email)
    phone    = validate_phone(req.phone_number)
    aadhaar  = validate_aadhaar(req.aadhaarNo, "Manager Aadhaar")
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
    return {"message": "Manager added.", "manager_id": manager_id}


@router.delete("/managers/{manager_id}")
def remove_manager(manager_id: str, conn=Depends(get_db), user=Depends(admin_only)):
    try:
        with conn.cursor() as cur:
            cur.callproc("sp_remove_manager", (manager_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Manager deactivated."}


@router.patch("/managers/{manager_id}/reactivate")
def reactivate_manager(manager_id: str, conn=Depends(get_db), user=Depends(admin_only)):
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE MANAGER SET active_flag=1 WHERE manager_id=%s", (manager_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Manager reactivated."}


# ── Agents ────────────────────────────────────────────────────────────────────

@router.get("/agents")
def list_all_agents(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.*, m.name AS manager_name,
                   COUNT(ap.appointment_id) AS total_appointments,
                   COUNT(t.transaction_id) AS total_deals
            FROM AGENT a
            JOIN MANAGER m ON a.manager_id=m.manager_id
            LEFT JOIN APPOINTMENT ap ON a.agent_id=ap.agent_id
            LEFT JOIN TRANSACTION t ON ap.appointment_id=t.appointment_id
            GROUP BY a.agent_id ORDER BY a.hire_date DESC
        """)
        return cur.fetchall()


class AddAgentReq(BaseModel):
    manager_id: str
    name: str
    phone: str
    email: str
    hire_date: str
    base_salary: float
    password: str


@router.post("/agents")
def add_agent(req: AddAgentReq, conn=Depends(get_db), user=Depends(admin_only)):
    from services.auth_service import hash_password
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
    return {"message": "Agent added.", "agent_id": agent_id}


@router.delete("/agents/{agent_id}")
def remove_agent(agent_id: str, conn=Depends(get_db), user=Depends(admin_only)):
    try:
        with conn.cursor() as cur:
            cur.callproc("sp_remove_agent", (agent_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Agent deactivated."}


@router.patch("/agents/{agent_id}/reactivate")
def reactivate_agent(agent_id: str, conn=Depends(get_db), user=Depends(admin_only)):
    try:
        with conn.cursor() as cur:
            cur.execute("UPDATE AGENT SET active_flag=1 WHERE agent_id=%s", (agent_id,))
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Agent reactivated."}


# ── Clients ───────────────────────────────────────────────────────────────────

@router.get("/clients")
def list_all_clients(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT c.*,
                   COUNT(DISTINCT p.property_id) AS property_count,
                   COUNT(DISTINCT t.transaction_id) AS transaction_count
            FROM CLIENT c
            LEFT JOIN PROPERTY p ON c.client_id=p.owner_id
            LEFT JOIN TRANSACTION t ON c.client_id=t.buyer_client_id OR c.client_id=t.seller_client_id
            GROUP BY c.client_id ORDER BY c.name
        """)
        return cur.fetchall()


# ── Transactions & Listings ───────────────────────────────────────────────────

@router.get("/transactions")
def list_all_transactions(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.*, bc.name AS buyer_name, sc.name AS seller_name,
                   l.listing_type, a.city, ag.name AS agent_name,
                   ra.rent_amount, ra.end_date AS rent_end_date
            FROM TRANSACTION t
            JOIN CLIENT bc ON t.buyer_client_id=bc.client_id
            JOIN CLIENT sc ON t.seller_client_id=sc.client_id
            JOIN LISTING l ON t.listing_id=l.listing_id
            JOIN ADDRESS a ON l.property_id=a.property_id
            JOIN APPOINTMENT ap ON t.appointment_id=ap.appointment_id
            JOIN AGENT ag ON ap.agent_id=ag.agent_id
            LEFT JOIN RENT_AGREEMENT ra ON t.rent_id=ra.rent_id
            ORDER BY t.sell_date DESC
        """)
        return cur.fetchall()


@router.get("/listings")
def list_all_listings_admin(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT l.*, p.property_type, p.build_year, p.size_sqft,
                   a.city, a.street, a.pincode, loc.locality_name,
                   c.name AS owner_name, f.bedrooms, f.bathrooms
            FROM LISTING l
            JOIN PROPERTY p ON l.property_id=p.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN CLIENT c ON p.owner_id=c.client_id
            JOIN FEATURES f ON p.property_id=f.property_id
            ORDER BY l.list_date DESC
        """)
        return cur.fetchall()


# ── SQL Console ───────────────────────────────────────────────────────────────

class SQLQueryRequest(BaseModel):
    query: str


@router.post("/run-query")
def run_custom_query(req: SQLQueryRequest, conn=Depends(get_db), user=Depends(admin_only)):
    q = req.query.strip().upper()
    if not (q.startswith("SELECT") or q.startswith("WITH") or q.startswith("SHOW")):
        raise HTTPException(status_code=400, detail="Only SELECT / WITH / SHOW queries are allowed.")
    try:
        with conn.cursor() as cur:
            cur.execute(req.query)
            rows = cur.fetchall()
        return {"rows": rows, "count": len(rows)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ── Academic Queries (a–f) ─────────────────────────────────────────────────────

@router.get("/queries/a")
def query_a(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.property_id, p.property_type, p.build_year, p.size_sqft,
                   a.house_no, a.street, a.city, a.state, a.pincode,
                   l.listing_id, l.price_rent, l.status, loc.locality_name,
                   f.bedrooms, f.bathrooms
            FROM PROPERTY p
            JOIN LISTING l ON p.property_id=l.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE l.listing_type IN ('RENT','BOTH') AND l.status='ACTIVE'
              AND p.build_year >= 2023
            ORDER BY p.build_year DESC
        """)
        return cur.fetchall()


@router.get("/queries/b")
def query_b(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.property_id, p.property_type, p.build_year, p.size_sqft,
                   a.house_no, a.street, a.city, a.state, a.pincode,
                   l.listing_id, l.price_sell, l.status, loc.locality_name,
                   f.bedrooms, f.bathrooms
            FROM PROPERTY p
            JOIN LISTING l ON p.property_id=l.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE l.price_sell BETWEEN 2000000 AND 6000000
              AND l.listing_type IN ('SALE','BOTH')
            ORDER BY l.price_sell
        """)
        return cur.fetchall()


@router.get("/queries/c")
def query_c(locality: str = "G.S.Road", conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.property_id, p.property_type, p.build_year, p.size_sqft,
                   a.house_no, a.street, a.city, a.state, a.pincode,
                   l.listing_id, l.price_rent, l.price_sell, l.listing_type, l.status,
                   loc.locality_name, f.bedrooms, f.bathrooms
            FROM PROPERTY p
            JOIN LISTING l ON p.property_id=l.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE loc.locality_name = %s OR a.street LIKE %s
            ORDER BY l.list_date DESC
        """, (locality, f"%{locality}%"))
        return cur.fetchall()


@router.get("/queries/d")
def query_d(year: int = 2023, conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            WITH agent_revenue AS (
                SELECT ap.agent_id, ag.name, SUM(t.sold_price) AS total_revenue,
                       COUNT(t.transaction_id) AS deals
                FROM TRANSACTION t
                JOIN APPOINTMENT ap ON t.appointment_id=ap.appointment_id
                JOIN AGENT ag ON ap.agent_id=ag.agent_id
                WHERE YEAR(t.sell_date)=%s AND t.sold_price IS NOT NULL
                GROUP BY ap.agent_id, ag.name
            )
            SELECT *, RANK() OVER (ORDER BY total_revenue DESC) AS rank_pos
            FROM agent_revenue ORDER BY total_revenue DESC
            LIMIT 1
        """, (year,))
        return cur.fetchall()


@router.get("/queries/e")
def query_e(year: int = 2018, conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ag.agent_id, ag.name,
                   AVG(t.sold_price) AS avg_price,
                   COUNT(t.transaction_id) AS deals,
                   SUM(t.sold_price) AS total_revenue
            FROM AGENT ag
            JOIN APPOINTMENT ap ON ag.agent_id=ap.agent_id
            JOIN TRANSACTION t ON ap.appointment_id=t.appointment_id
            WHERE YEAR(t.sell_date)=%s AND t.sold_price IS NOT NULL
            GROUP BY ag.agent_id, ag.name ORDER BY avg_price DESC
        """, (year,))
        return cur.fetchall()


@router.get("/queries/f")
def query_f(conn=Depends(get_db), user=Depends(admin_only)):
    with conn.cursor() as cur:
        cur.execute("""
            (SELECT 'Most Expensive Sale' AS category, p.property_id, p.property_type,
                    a.city, a.street, l.price_sell AS amount, c.name AS owner_name
             FROM PROPERTY p JOIN LISTING l ON p.property_id=l.property_id
             JOIN ADDRESS a ON p.property_id=a.property_id JOIN CLIENT c ON p.owner_id=c.client_id
             WHERE l.listing_type IN ('SALE','BOTH') AND l.price_sell IS NOT NULL
             ORDER BY l.price_sell DESC LIMIT 1)
            UNION ALL
            (SELECT 'Highest Rent' AS category, p.property_id, p.property_type,
                    a.city, a.street, l.price_rent AS amount, c.name AS owner_name
             FROM PROPERTY p JOIN LISTING l ON p.property_id=l.property_id
             JOIN ADDRESS a ON p.property_id=a.property_id JOIN CLIENT c ON p.owner_id=c.client_id
             WHERE l.listing_type IN ('RENT','BOTH') AND l.price_rent IS NOT NULL
             ORDER BY l.price_rent DESC LIMIT 1)
        """)
        return cur.fetchall()
