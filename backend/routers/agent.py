import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from services.dependencies import require_role
from services.validators import validate_price

router = APIRouter(prefix="/agent", tags=["agent"])
agent_access = require_role("agent", "manager", "admin")


@router.get("/profile/{agent_id}")
def agent_profile(agent_id: str, conn=Depends(get_db), user=Depends(agent_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.*, m.name AS manager_name,
                   COUNT(DISTINCT ap.appointment_id) AS total_appointments,
                   COUNT(DISTINCT t.transaction_id)  AS total_deals,
                   COALESCE(SUM(t.sold_price), 0)    AS total_revenue
            FROM AGENT a
            JOIN MANAGER m ON a.manager_id = m.manager_id
            LEFT JOIN APPOINTMENT ap ON a.agent_id = ap.agent_id
            LEFT JOIN TRANSACTION t  ON ap.appointment_id = t.appointment_id
            WHERE a.agent_id = %s GROUP BY a.agent_id
        """, (agent_id,))
        agent = cur.fetchone()
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found.")
        return agent

@router.get("/listings")
def agent_listings(conn=Depends(get_db), user=Depends(agent_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT l.listing_id, l.listing_type, l.price_rent, l.price_sell, l.status,
                   p.property_type,
                   a.city,
                   loc.locality_name,
                   c.name AS owner_name,
                   f.bedrooms
            FROM LISTING l
            JOIN PROPERTY p   ON l.property_id  = p.property_id
            JOIN ADDRESS a    ON p.property_id  = a.property_id
            JOIN LOCALITY loc ON a.locality_id  = loc.locality_id
            JOIN CLIENT c     ON p.owner_id     = c.client_id
            JOIN FEATURES f   ON p.property_id  = f.property_id
            WHERE l.status = 'ACTIVE'
            ORDER BY l.list_date DESC
        """)
        return cur.fetchall()

@router.get("/transactions/{agent_id}")
def agent_transactions(agent_id: str, conn=Depends(get_db), user=Depends(agent_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT 
                t.transaction_id,
                t.sell_date,
                t.sold_price,
                t.rent_id,
                ap.appointment_id,
                ap.deal_status,
                bc.name AS buyer_name,
                sc.name AS seller_name,
                l.listing_type,
                l.listing_id,
                a.city,
                loc.locality_name
            FROM TRANSACTION t
            JOIN APPOINTMENT ap ON t.appointment_id = ap.appointment_id
            JOIN LISTING l      ON t.listing_id     = l.listing_id
            JOIN PROPERTY p     ON l.property_id    = p.property_id
            JOIN ADDRESS a      ON p.property_id    = a.property_id
            JOIN LOCALITY loc   ON a.locality_id    = loc.locality_id
            JOIN CLIENT bc      ON t.buyer_client_id  = bc.client_id
            JOIN CLIENT sc      ON t.seller_client_id = sc.client_id
            WHERE ap.agent_id = %s
            ORDER BY t.sell_date DESC
        """, (agent_id,))
        return cur.fetchall()

@router.get("/rent/{rent_id}")
def get_rent_agreement(rent_id: str, conn=Depends(get_db), user=Depends(agent_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT * FROM RENT_AGREEMENT
            WHERE rent_id = %s
        """, (rent_id,))
        rent = cur.fetchone()
        if not rent:
            raise HTTPException(404, "Rent agreement not found.")
        return rent

@router.get("/appointments/{agent_id}")
def agent_appointments(agent_id: str, status: str = "all",
                       conn=Depends(get_db), user=Depends(agent_access)):
    # deal_status: 0=open/pending, 1=successful, 2=failed/unsuccessful
    where_extra = ""
    if status == "pending":
        where_extra = "AND ap.deal_status = 0"
    elif status == "done":
        where_extra = "AND ap.deal_status IN (1, 2)"
    elif status == "upcoming":
        where_extra = "AND ap.deal_status = 0 AND ap.schedule_date_time > NOW()"

    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT ap.*,
                   bc.name AS buyer_name, bc.phone AS buyer_phone, bc.email AS buyer_email,
                   l.listing_type, l.price_rent, l.price_sell, l.status AS listing_status,
                   p.property_type, p.size_sqft, p.build_year,
                   a.house_no, a.street, a.city, a.pincode,
                   loc.locality_name, f.bedrooms, f.bathrooms
            FROM APPOINTMENT ap
            JOIN CLIENT bc     ON ap.buyer_client_id = bc.client_id
            JOIN LISTING l     ON ap.listing_id      = l.listing_id
            JOIN PROPERTY p    ON l.property_id      = p.property_id
            JOIN ADDRESS a     ON p.property_id      = a.property_id
            JOIN LOCALITY loc  ON a.locality_id      = loc.locality_id
            JOIN FEATURES f    ON p.property_id      = f.property_id
            WHERE ap.agent_id = %s {where_extra}
            ORDER BY ap.schedule_date_time DESC
        """, (agent_id,))
        return cur.fetchall()


class CloseDealRequest(BaseModel):
    appointment_id: str
    deal_type: str
    sold_price: Optional[float] = None
    rent_amount: Optional[float] = None
    security_deposit: Optional[float] = 0.0
    rent_end_date: Optional[str] = None


@router.post("/close-deal")
def close_deal(req: CloseDealRequest, conn=Depends(get_db), user=Depends(agent_access)):
    if req.deal_type not in ("SALE", "RENT"):
        raise HTTPException(400, "Deal type must be 'SALE' or 'RENT'.")

    if req.deal_type == "SALE":
        if not req.sold_price or req.sold_price <= 0:
            raise HTTPException(400, "Sale price is required and must be greater than zero.")
    else:
        if not req.rent_amount or req.rent_amount <= 0:
            raise HTTPException(400, "Monthly rent amount is required.")
        if not req.rent_end_date:
            raise HTTPException(400, "Rent agreement end date is required.")
        if req.security_deposit and req.security_deposit < 0:
            raise HTTPException(400, "Security deposit cannot be negative.")

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT ap.*, l.property_id, l.listing_type,
                       p.owner_id AS seller_client_id
                FROM APPOINTMENT ap
                JOIN LISTING l ON ap.listing_id = l.listing_id
                JOIN PROPERTY p ON l.property_id = p.property_id
                WHERE ap.appointment_id = %s AND ap.deal_status = 0
            """, (req.appointment_id,))
            apt = cur.fetchone()
            if not apt:
                raise HTTPException(404, "Appointment not found or already closed.")

            buyer_id  = apt["buyer_client_id"]
            seller_id = apt["seller_client_id"]

            if buyer_id == seller_id:
                raise HTTPException(400, "Buyer and seller cannot be the same person.")

            txn_id = f"TXN-{uuid.uuid4().hex[:8].upper()}"
            cur.execute("""
                INSERT INTO TRANSACTION(transaction_id, listing_id, buyer_client_id,
                           seller_client_id, appointment_id, rent_id, sell_date, sold_price)
                VALUES(%s, %s, %s, %s, %s, NULL, CURDATE(), %s)
            """, (txn_id, apt["listing_id"], buyer_id, seller_id,
                  req.appointment_id,
                  req.sold_price if req.deal_type == "SALE" else None))

            rent_id = None
            if req.deal_type == "RENT":
                rent_id = f"RENT-{uuid.uuid4().hex[:8].upper()}"
                cur.execute("""
                    INSERT INTO RENT_AGREEMENT(rent_id, transaction_id, end_date,
                               rent_amount, security_deposit)
                    VALUES(%s, %s, %s, %s, %s)
                """, (rent_id, txn_id, req.rent_end_date,
                      req.rent_amount, req.security_deposit or 0))
                cur.execute(
                    "UPDATE TRANSACTION SET rent_id=%s WHERE transaction_id=%s",
                    (rent_id, txn_id))
                cur.execute(
                    "UPDATE LISTING SET status='RENTED', close_date=CURDATE() WHERE listing_id=%s",
                    (apt["listing_id"],))
            else:
                cur.execute(
                    "UPDATE LISTING SET status='SOLD', close_date=CURDATE() WHERE listing_id=%s",
                    (apt["listing_id"],))

            # Mark appointment as successfully closed (deal_status=1)
            cur.execute(
                "UPDATE APPOINTMENT SET deal_status=1 WHERE appointment_id=%s",
                (req.appointment_id,))

        conn.commit()
        return {
            "message": "Deal closed successfully.",
            "transaction_id": txn_id,
            "rent_id": rent_id
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))


@router.post("/fail-deal/{appointment_id}")
def fail_deal(appointment_id: str, conn=Depends(get_db), user=Depends(agent_access)):
    """
    Mark appointment as unsuccessful.
    Uses deal_status=2. Requires ALTER TABLE first (see fix_deal_status.sql).
    Listing stays ACTIVE for future bookings.
    """
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM APPOINTMENT WHERE appointment_id=%s AND deal_status=0",
                (appointment_id,))
            if not cur.fetchone():
                raise HTTPException(404, "Appointment not found or already closed.")
            cur.execute(
                "UPDATE APPOINTMENT SET deal_status=2 WHERE appointment_id=%s",
                (appointment_id,))
        conn.commit()
        return {"message": "Appointment marked as unsuccessful."}
    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(400, str(e))


@router.get("/performance/{agent_id}")
def agent_performance(agent_id: str, conn=Depends(get_db), user=Depends(agent_access)):
    with conn.cursor() as cur:
        # FIX: Use %% to escape % in PyMySQL so %Y and %m are not treated as param placeholders
        cur.execute("""
            SELECT DATE_FORMAT(t.sell_date,'%%Y-%%m') AS month,
                   COUNT(t.transaction_id)        AS deals,
                   COALESCE(SUM(t.sold_price), 0) AS revenue
            FROM APPOINTMENT ap
            JOIN TRANSACTION t ON ap.appointment_id = t.appointment_id
            WHERE ap.agent_id = %s
            GROUP BY month ORDER BY month
        """, (agent_id,))
        monthly = cur.fetchall()

        cur.execute("""
            SELECT COUNT(ap.appointment_id)                           AS total_appointments,
                   SUM(CASE WHEN ap.deal_status=1 THEN 1 ELSE 0 END) AS successful_deals,
                   COUNT(DISTINCT t.transaction_id)                   AS transactions,
                   COALESCE(SUM(t.sold_price), 0)                     AS total_revenue
            FROM APPOINTMENT ap
            LEFT JOIN TRANSACTION t ON ap.appointment_id = t.appointment_id
            WHERE ap.agent_id = %s
        """, (agent_id,))
        summary = cur.fetchone()
        total = summary["total_appointments"] or 1
        summary["conversion_rate"] = round(
            (summary["successful_deals"] or 0) / total * 100, 1)

    return {"monthly": monthly, "summary": summary}
