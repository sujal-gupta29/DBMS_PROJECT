from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from db.database import get_db
from services.dependencies import require_role

router = APIRouter(prefix="/manager", tags=["manager"])
manager_only = require_role("manager", "admin")


@router.get("/dashboard/{manager_id}")
def manager_dashboard(manager_id: str, conn=Depends(get_db), user=Depends(manager_only)):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM MANAGER WHERE manager_id=%s", (manager_id,))
        mgr = cur.fetchone()
        if not mgr:
            raise HTTPException(404, "Manager not found.")
        cur.execute(
            "SELECT COUNT(*) AS c FROM AGENT WHERE manager_id=%s AND active_flag=1",
            (manager_id,))
        active_agents = cur.fetchone()["c"]
        cur.execute("""
            SELECT COUNT(t.transaction_id) AS total_deals,
                   COALESCE(SUM(t.sold_price), 0) AS revenue
            FROM AGENT ag
            JOIN APPOINTMENT ap ON ag.agent_id = ap.agent_id
            JOIN TRANSACTION t  ON ap.appointment_id = t.appointment_id
            WHERE ag.manager_id = %s
        """, (manager_id,))
        perf = cur.fetchone()
        cur.execute("""
            SELECT COUNT(*) AS pending FROM APPOINTMENT ap
            JOIN AGENT ag ON ap.agent_id = ag.agent_id
            WHERE ag.manager_id=%s AND ap.deal_status=0 AND ap.schedule_date_time > NOW()
        """, (manager_id,))
        pending = cur.fetchone()["pending"]
    return {**mgr, "active_agents": active_agents,
            "pending_appointments": pending, **perf}


@router.get("/agents/{manager_id}")
def get_agents_under_manager(manager_id: str, conn=Depends(get_db),
                              user=Depends(manager_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.*,
                   COUNT(DISTINCT ap.appointment_id) AS total_appointments,
                   COUNT(DISTINCT t.transaction_id)  AS total_deals,
                   COALESCE(SUM(t.sold_price), 0)    AS total_revenue,
                   SUM(CASE WHEN l.listing_type='RENT' THEN 1 ELSE 0 END)            AS rent_deals,
                   SUM(CASE WHEN l.listing_type IN ('SALE','BOTH') THEN 1 ELSE 0 END) AS sale_deals
            FROM AGENT a
            LEFT JOIN APPOINTMENT ap ON a.agent_id = ap.agent_id AND ap.deal_status = 1
            LEFT JOIN TRANSACTION t  ON ap.appointment_id = t.appointment_id
            LEFT JOIN LISTING l      ON t.listing_id = l.listing_id
            WHERE a.manager_id = %s
            GROUP BY a.agent_id ORDER BY total_revenue DESC
        """, (manager_id,))
        return cur.fetchall()


@router.get("/agent-performance/{manager_id}")
def agent_performance(manager_id: str, conn=Depends(get_db),
                      user=Depends(manager_only)):
    with conn.cursor() as cur:
        # FIX: %% to escape % in PyMySQL so %Y/%m aren't treated as param placeholders
        cur.execute("""
            SELECT ag.agent_id, ag.name,
                   DATE_FORMAT(t.sell_date, '%%Y-%%m') AS month,
                   COUNT(t.transaction_id)             AS deals,
                   COALESCE(SUM(t.sold_price), 0)      AS revenue
            FROM AGENT ag
            LEFT JOIN APPOINTMENT ap ON ag.agent_id = ap.agent_id AND ap.deal_status = 1
            LEFT JOIN TRANSACTION t  ON ap.appointment_id = t.appointment_id
            WHERE ag.manager_id = %s AND t.sell_date IS NOT NULL
            GROUP BY ag.agent_id, ag.name, month ORDER BY month, ag.name
        """, (manager_id,))
        return cur.fetchall()


@router.get("/agent-details/{agent_id}")
def agent_details(agent_id: str, conn=Depends(get_db), user=Depends(manager_only)):
    """Full sale + rent transaction details for a specific agent."""
    with conn.cursor() as cur:
        # Sale transactions
        cur.execute("""
            SELECT t.transaction_id, t.sell_date, t.sold_price,
                   bc.name AS buyer_name, sc.name AS seller_name,
                   p.property_type, a.city, a.street, a.house_no,
                   l.listing_type, l.price_sell
            FROM TRANSACTION t
            JOIN APPOINTMENT ap ON t.appointment_id = ap.appointment_id
            JOIN CLIENT bc      ON t.buyer_client_id  = bc.client_id
            JOIN CLIENT sc      ON t.seller_client_id = sc.client_id
            JOIN LISTING l      ON t.listing_id = l.listing_id
            JOIN PROPERTY p     ON l.property_id = p.property_id
            JOIN ADDRESS a      ON p.property_id = a.property_id
            WHERE ap.agent_id = %s
              AND l.listing_type IN ('SALE','BOTH')
              AND t.sold_price IS NOT NULL
            ORDER BY t.sell_date DESC
        """, (agent_id,))
        sales = cur.fetchall()

        # Rent transactions + agreements
        cur.execute("""
            SELECT t.transaction_id, t.sell_date,
                   bc.name AS tenant_name, sc.name AS landlord_name,
                   p.property_type, a.city, a.street, a.house_no,
                   l.listing_type, l.price_rent,
                   ra.rent_id, ra.rent_amount, ra.end_date AS rent_end,
                   ra.security_deposit
            FROM TRANSACTION t
            JOIN APPOINTMENT ap ON t.appointment_id = ap.appointment_id
            JOIN CLIENT bc      ON t.buyer_client_id  = bc.client_id
            JOIN CLIENT sc      ON t.seller_client_id = sc.client_id
            JOIN LISTING l      ON t.listing_id = l.listing_id
            JOIN PROPERTY p     ON l.property_id = p.property_id
            JOIN ADDRESS a      ON p.property_id = a.property_id
            LEFT JOIN RENT_AGREEMENT ra ON t.rent_id = ra.rent_id
            WHERE ap.agent_id = %s
              AND l.listing_type IN ('RENT','BOTH')
              AND t.sold_price IS NULL
            ORDER BY t.sell_date DESC
        """, (agent_id,))
        rents = cur.fetchall()

    return {"sales": sales, "rents": rents}


@router.get("/appointments/{manager_id}")
def manager_appointments(manager_id: str, status: str = "all",
                         conn=Depends(get_db), user=Depends(manager_only)):
    where_extra = ""
    if status == "pending":
        where_extra = "AND ap.deal_status=0 AND ap.schedule_date_time > NOW()"
    elif status == "done":
        where_extra = "AND ap.deal_status IN (1, 2)"

    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT ap.*, ag.name AS agent_name,
                   bc.name AS buyer_name,
                   l.listing_type, a.city, a.street
            FROM APPOINTMENT ap
            JOIN AGENT ag  ON ap.agent_id       = ag.agent_id
            JOIN CLIENT bc ON ap.buyer_client_id = bc.client_id
            JOIN LISTING l ON ap.listing_id      = l.listing_id
            JOIN PROPERTY p ON l.property_id     = p.property_id
            JOIN ADDRESS a  ON p.property_id     = a.property_id
            WHERE ag.manager_id = %s {where_extra}
            ORDER BY ap.schedule_date_time DESC
        """, (manager_id,))
        return cur.fetchall()


@router.get("/transactions/{manager_id}")
def manager_transactions(manager_id: str, conn=Depends(get_db),
                         user=Depends(manager_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.*,
                   bc.name AS buyer_name, sc.name AS seller_name,
                   ag.name AS agent_name,
                   l.listing_type,
                   a.city, a.street,
                   p.property_type, p.property_id,
                   ra.rent_amount, ra.end_date AS rent_end,
                   ra.security_deposit
            FROM TRANSACTION t
            JOIN APPOINTMENT ap ON t.appointment_id  = ap.appointment_id
            JOIN AGENT ag       ON ap.agent_id        = ag.agent_id
            JOIN CLIENT bc      ON t.buyer_client_id  = bc.client_id
            JOIN CLIENT sc      ON t.seller_client_id = sc.client_id
            JOIN LISTING l      ON t.listing_id       = l.listing_id
            JOIN PROPERTY p     ON l.property_id      = p.property_id
            JOIN ADDRESS a      ON p.property_id      = a.property_id
            LEFT JOIN RENT_AGREEMENT ra ON t.rent_id  = ra.rent_id
            WHERE ag.manager_id = %s ORDER BY t.sell_date DESC
        """, (manager_id,))
        return cur.fetchall()


@router.get("/listings")
def manager_listings(conn=Depends(get_db), user=Depends(manager_only)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT l.*, p.property_type, p.build_year, p.size_sqft,
                   a.city, a.street, a.pincode, loc.locality_name,
                   c.name AS owner_name, f.bedrooms, f.bathrooms
            FROM LISTING l
            JOIN PROPERTY p   ON l.property_id  = p.property_id
            JOIN ADDRESS a    ON p.property_id  = a.property_id
            JOIN LOCALITY loc ON a.locality_id  = loc.locality_id
            JOIN CLIENT c     ON p.owner_id     = c.client_id
            JOIN FEATURES f   ON p.property_id  = f.property_id
            ORDER BY l.list_date DESC
        """)
        return cur.fetchall()


class ReassignAgentReq(BaseModel):
    agent_id: str
    new_manager_id: str


@router.post("/reassign-agent")
def reassign_agent(req: ReassignAgentReq, conn=Depends(get_db),
                   user=Depends(manager_only)):
    if not req.agent_id.strip():
        raise HTTPException(400, "Agent ID is required.")
    if not req.new_manager_id.strip():
        raise HTTPException(400, "New Manager ID is required.")
    try:
        with conn.cursor() as cur:
            cur.callproc("sp_reassign_agent", (req.agent_id, req.new_manager_id))
        conn.commit()
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Agent reassigned successfully."}
