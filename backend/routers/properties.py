"""
Shared property-related endpoints accessible by multiple roles.
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from services.dependencies import require_role

router = APIRouter(prefix="/properties", tags=["properties"])
any_auth = require_role("client", "admin", "manager", "agent")


@router.get("/{property_id}")
def get_property_detail(property_id: str, conn=Depends(get_db), user=Depends(any_auth)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.*,
                   c.name AS owner_name, c.phone AS owner_phone, c.email AS owner_email,
                   a.house_no, a.street, a.city, a.state, a.pincode,
                   a.coord_x, a.coord_y,
                   loc.locality_id, loc.locality_name,
                   loc.school, loc.gym, loc.park, loc.swimming_pool, loc.hospital,
                   f.bedrooms, f.bathrooms, f.floors, f.balcony, f.kitchen
            FROM PROPERTY p
            JOIN CLIENT c  ON p.owner_id     = c.client_id
            JOIN ADDRESS a ON p.property_id  = a.property_id
            JOIN LOCALITY loc ON a.locality_id = loc.locality_id
            JOIN FEATURES f ON p.property_id = f.property_id
            WHERE p.property_id = %s
        """, (property_id,))
        prop = cur.fetchone()
        if not prop:
            raise HTTPException(status_code=404, detail="Property not found")

        # Listings for this property
        cur.execute("""
            SELECT * FROM LISTING WHERE property_id = %s ORDER BY list_date DESC
        """, (property_id,))
        prop["listings"] = cur.fetchall()

    return prop


@router.get("/{property_id}/history")
def get_property_transaction_history(property_id: str, conn=Depends(get_db), user=Depends(any_auth)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.*,
                   bc.name AS buyer_name,
                   sc.name AS seller_name,
                   ag.name AS agent_name,
                   l.listing_type,
                   ra.rent_amount, ra.end_date AS rent_end_date, ra.security_deposit
            FROM TRANSACTION t
            JOIN LISTING l  ON t.listing_id     = l.listing_id
            JOIN CLIENT bc  ON t.buyer_client_id  = bc.client_id
            JOIN CLIENT sc  ON t.seller_client_id = sc.client_id
            JOIN APPOINTMENT ap ON t.appointment_id = ap.appointment_id
            JOIN AGENT ag   ON ap.agent_id       = ag.agent_id
            LEFT JOIN RENT_AGREEMENT ra ON t.rent_id = ra.rent_id
            WHERE l.property_id = %s
            ORDER BY t.sell_date DESC
        """, (property_id,))
        return cur.fetchall()
