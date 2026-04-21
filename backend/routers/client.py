import uuid
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from db.database import get_db
from services.dependencies import require_role
from services.validators import (
    validate_pincode, validate_build_year, validate_size_sqft,
    validate_bedrooms, validate_floors, validate_price
)

router = APIRouter(prefix="/client", tags=["client"])
client_access = require_role("client", "admin")
any_auth = require_role("client", "admin", "manager", "agent")


# ── Properties ────────────────────────────────────────────────────────────────

class AddPropertyRequest(BaseModel):
    owner_id: str
    property_type: str
    size_sqft: float
    build_year: int
    locality_id: str
    house_no: str
    block_no: Optional[str] = None
    street: str
    city: str
    state: str
    pincode: str
    coord_x: Optional[float] = None
    coord_y: Optional[float] = None
    bedrooms: int = 0
    bathrooms: int = 0
    floors: int = 1
    balcony: bool = False
    kitchen: bool = True


@router.post("/properties")
def add_property(req: AddPropertyRequest, conn=Depends(get_db), user=Depends(client_access)):
    # Validate
    if req.property_type not in ("House", "Apartment"):
        raise HTTPException(400, "Property type must be 'House' or 'Apartment'.")
    size     = validate_size_sqft(req.size_sqft)
    yr       = validate_build_year(req.build_year)
    pincode  = validate_pincode(req.pincode)
    beds     = validate_bedrooms(req.bedrooms)
    baths    = validate_bedrooms(req.bathrooms)
    floors   = validate_floors(req.floors)
    if not req.house_no.strip():
        raise HTTPException(400, "House number is required.")
    if not req.street.strip():
        raise HTTPException(400, "Street is required.")
    if not req.city.strip():
        raise HTTPException(400, "City is required.")
    if not req.state.strip():
        raise HTTPException(400, "State is required.")

    prop_id = f"PROP-{uuid.uuid4().hex[:8].upper()}"
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO PROPERTY(property_id,owner_id,property_type,size_sqft,build_year) VALUES(%s,%s,%s,%s,%s)",
                (prop_id, req.owner_id, req.property_type, size, yr)
            )
            cur.execute("""
                INSERT INTO ADDRESS(property_id,locality_id,house_no,block_no,street,city,state,pincode,coord_x,coord_y)
                VALUES(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            """, (prop_id, req.locality_id, req.house_no.strip(), req.block_no,
                  req.street.strip(), req.city.strip(), req.state.strip(), pincode, req.coord_x, req.coord_y))
            cur.execute("""
                INSERT INTO FEATURES(property_id,bedrooms,bathrooms,floors,balcony,kitchen)
                VALUES(%s,%s,%s,%s,%s,%s)
            """, (prop_id, beds, baths, floors, int(req.balcony), int(req.kitchen)))
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Property added successfully.", "property_id": prop_id}


@router.get("/properties/{client_id}")
def my_properties(client_id: str, conn=Depends(get_db), user=Depends(client_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT p.*, a.house_no, a.street, a.city, a.state, a.pincode,
                   loc.locality_name,
                   f.bedrooms, f.bathrooms, f.floors, f.balcony, f.kitchen,
                   l.listing_id, l.listing_type, l.status AS listing_status,
                   l.price_rent, l.price_sell
            FROM PROPERTY p
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            LEFT JOIN LISTING l ON p.property_id=l.property_id
            WHERE p.owner_id=%s ORDER BY p.property_id
        """, (client_id,))
        return cur.fetchall()


# ── Listings ──────────────────────────────────────────────────────────────────

class AddListingRequest(BaseModel):
    property_id: str
    listing_type: str
    price_rent: Optional[float] = None
    price_sell: Optional[float] = None


@router.post("/listings")
def add_listing(req: AddListingRequest, conn=Depends(get_db), user=Depends(client_access)):
    if req.listing_type not in ("SALE", "RENT", "BOTH"):
        raise HTTPException(400, "Listing type must be SALE, RENT, or BOTH.")
    if req.listing_type in ("SALE", "BOTH") and not req.price_sell:
        raise HTTPException(400, "Sale price is required for SALE or BOTH listing type.")
    if req.listing_type in ("RENT", "BOTH") and not req.price_rent:
        raise HTTPException(400, "Rent price is required for RENT or BOTH listing type.")
    price_sell = validate_price(req.price_sell, "Sale price")
    price_rent = validate_price(req.price_rent, "Rent price")

    listing_id = f"LST-{uuid.uuid4().hex[:8].upper()}"
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM LISTING WHERE property_id=%s AND status='ACTIVE'", (req.property_id,))
            if cur.fetchone():
                raise HTTPException(400, "This property already has an active listing.")
            cur.execute("""
                INSERT INTO LISTING(listing_id,property_id,listing_type,list_date,price_rent,price_sell,status)
                VALUES(%s,%s,%s,CURDATE(),%s,%s,'ACTIVE')
            """, (listing_id, req.property_id, req.listing_type, price_rent, price_sell))
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Listing created successfully.", "listing_id": listing_id}


# ── Browse Listings ───────────────────────────────────────────────────────────

@router.get("/listings/browse")
def browse_listings(
    city: Optional[str] = None,
    listing_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    bedrooms: Optional[int] = None,
    property_type: Optional[str] = None,
    locality: Optional[str] = None,
    status: str = "ACTIVE",
    page: int = 1,
    page_size: int = 12,
    conn=Depends(get_db),
    user=Depends(any_auth)
):
    conditions = ["l.status = %s"]
    params: list = [status]

    if city:
        conditions.append("a.city = %s"); params.append(city)
    if listing_type and listing_type not in ("ALL", ""):
        conditions.append("(l.listing_type = %s OR l.listing_type = 'BOTH')"); params.append(listing_type)
    if min_price is not None:
        conditions.append("(l.price_sell >= %s OR l.price_rent >= %s)"); params.extend([min_price, min_price])
    if max_price is not None:
        conditions.append("(l.price_sell <= %s OR l.price_rent <= %s)"); params.extend([max_price, max_price])
    if bedrooms is not None:
        conditions.append("f.bedrooms >= %s"); params.append(bedrooms)
    if property_type:
        conditions.append("p.property_type = %s"); params.append(property_type)
    if locality:
        conditions.append("loc.locality_name LIKE %s"); params.append(f"%{locality}%")

    where = " AND ".join(conditions)
    offset = (page - 1) * page_size

    with conn.cursor() as cur:
        cur.execute(f"""
            SELECT COUNT(*) AS total FROM LISTING l
            JOIN PROPERTY p ON l.property_id=p.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE {where}
        """, params)
        total = cur.fetchone()["total"]

        cur.execute(f"""
            SELECT l.*, p.property_type, p.build_year, p.size_sqft,
                   p.owner_id, oc.name AS owner_name,
                   a.house_no, a.street, a.city, a.state, a.pincode,
                   loc.locality_id, loc.locality_name,
                   loc.school, loc.gym, loc.park, loc.swimming_pool, loc.hospital,
                   f.bedrooms, f.bathrooms, f.floors, f.balcony, f.kitchen
            FROM LISTING l
            JOIN PROPERTY p ON l.property_id=p.property_id
            JOIN CLIENT oc ON p.owner_id=oc.client_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN LOCALITY loc ON a.locality_id=loc.locality_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE {where}
            ORDER BY l.list_date DESC LIMIT %s OFFSET %s
        """, params + [page_size, offset])
        listings = cur.fetchall()

    return {"total": total, "page": page, "page_size": page_size, "listings": listings}


# ── Appointments ──────────────────────────────────────────────────────────────

class BookAppointmentRequest(BaseModel):
    listing_id: str
    agent_id: str
    buyer_client_id: str
    schedule_date_time: str


@router.post("/appointments")
def book_appointment(req: BookAppointmentRequest, conn=Depends(get_db), user=Depends(client_access)):
    apt_id = f"APT-{uuid.uuid4().hex[:8].upper()}"
    try:
        with conn.cursor() as cur:
            # Agent must be active
            cur.execute("SELECT 1 FROM AGENT WHERE agent_id=%s AND active_flag=1", (req.agent_id,))
            if not cur.fetchone():
                raise HTTPException(400, "Selected agent is not active.")

            # Listing must be active
            cur.execute("SELECT property_id FROM LISTING WHERE listing_id=%s AND status='ACTIVE'", (req.listing_id,))
            lst = cur.fetchone()
            if not lst:
                raise HTTPException(400, "This listing is no longer active.")

            # Owner cannot book their own property
            cur.execute("SELECT owner_id FROM PROPERTY WHERE property_id=%s", (lst["property_id"],))
            prop = cur.fetchone()
            if prop and prop["owner_id"] == req.buyer_client_id:
                raise HTTPException(400, "You cannot book an appointment for your own property.")

            # No duplicate pending appointment for same listing by same buyer
            cur.execute("""
                SELECT 1 FROM APPOINTMENT
                WHERE listing_id=%s AND buyer_client_id=%s AND deal_status=0
            """, (req.listing_id, req.buyer_client_id))
            if cur.fetchone():
                raise HTTPException(400, "You already have a pending appointment for this listing.")

            cur.execute("""
                INSERT INTO APPOINTMENT(appointment_id,agent_id,buyer_client_id,listing_id,schedule_date_time,deal_status)
                VALUES(%s,%s,%s,%s,%s,0)
            """, (apt_id, req.agent_id, req.buyer_client_id, req.listing_id, req.schedule_date_time))
        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        msg = e.args[1] if hasattr(e, 'args') and len(e.args) > 1 else str(e)
        raise HTTPException(status_code=400, detail=str(msg))
    return {"message": "Appointment booked successfully.", "appointment_id": apt_id}


@router.get("/appointments/{client_id}")
def client_appointments(client_id: str, conn=Depends(get_db), user=Depends(client_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT ap.*,
                   ag.name AS agent_name, ag.phone AS agent_phone,
                   l.listing_type, l.price_rent, l.price_sell, l.status AS listing_status,
                   p.property_type, p.size_sqft,
                   a.house_no, a.street, a.city, f.bedrooms, f.bathrooms
            FROM APPOINTMENT ap
            JOIN AGENT ag ON ap.agent_id=ag.agent_id
            JOIN LISTING l ON ap.listing_id=l.listing_id
            JOIN PROPERTY p ON l.property_id=p.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            JOIN FEATURES f ON p.property_id=f.property_id
            WHERE ap.buyer_client_id=%s ORDER BY ap.schedule_date_time DESC
        """, (client_id,))
        return cur.fetchall()


@router.get("/transactions/{client_id}")
def client_transactions(client_id: str, conn=Depends(get_db), user=Depends(client_access)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT t.*,
                   bc.name AS buyer_name, sc.name AS seller_name,
                   ag.name AS agent_name, l.listing_type,
                   a.city, a.street, p.property_type,
                   ra.rent_amount, ra.end_date AS rent_end, ra.security_deposit
            FROM TRANSACTION t
            JOIN CLIENT bc ON t.buyer_client_id=bc.client_id
            JOIN CLIENT sc ON t.seller_client_id=sc.client_id
            JOIN APPOINTMENT ap ON t.appointment_id=ap.appointment_id
            JOIN AGENT ag ON ap.agent_id=ag.agent_id
            JOIN LISTING l ON t.listing_id=l.listing_id
            JOIN PROPERTY p ON l.property_id=p.property_id
            JOIN ADDRESS a ON p.property_id=a.property_id
            LEFT JOIN RENT_AGREEMENT ra ON t.rent_id=ra.rent_id
            WHERE t.buyer_client_id=%s OR t.seller_client_id=%s
            ORDER BY t.sell_date DESC
        """, (client_id, client_id))
        return cur.fetchall()


@router.get("/localities")
def get_localities(conn=Depends(get_db), user=Depends(any_auth)):
    with conn.cursor() as cur:
        cur.execute("SELECT * FROM LOCALITY ORDER BY locality_name")
        return cur.fetchall()


@router.get("/agents")
def get_active_agents(conn=Depends(get_db), user=Depends(any_auth)):
    with conn.cursor() as cur:
        cur.execute("""
            SELECT a.agent_id, a.name, a.phone, a.email, m.name AS manager_name
            FROM AGENT a JOIN MANAGER m ON a.manager_id=m.manager_id
            WHERE a.active_flag=1 ORDER BY a.name
        """)
        return cur.fetchall()
