"""
Central validation helpers — all input domain checks live here.
"""
import re
from fastapi import HTTPException


def validate_aadhaar(value: str, field: str = "Aadhaar") -> str:
    v = value.strip()
    if not re.fullmatch(r'\d{12}', v):
        raise HTTPException(400, f"{field} must be exactly 12 digits (no letters or spaces).")
    return v


def validate_phone(value: str, field: str = "Phone") -> str:
    # Accept optional +91 prefix then exactly 10 digits
    v = value.strip()
    digits = re.sub(r'^\+91', '', v).strip()
    if not re.fullmatch(r'\d{10}', digits):
        raise HTTPException(400, f"{field} must be exactly 10 digits (optionally prefixed with +91).")
    # Normalise to +91XXXXXXXXXX
    return f"+91{digits}"


def validate_email(value: str, field: str = "Email") -> str:
    v = value.strip().lower()
    # Only allow gmail.com
    if not re.fullmatch(r'[a-zA-Z0-9._%+\-]+@gmail\.com', v):
        raise HTTPException(400, f"{field} must be a valid @gmail.com address.")
    return v


def validate_name(value: str, field: str = "Name") -> str:
    v = value.strip()
    if len(v) < 2:
        raise HTTPException(400, f"{field} must be at least 2 characters.")
    if len(v) > 100:
        raise HTTPException(400, f"{field} must be at most 100 characters.")
    if not re.fullmatch(r"[A-Za-z\s'\-\.]+", v):
        raise HTTPException(400, f"{field} may only contain letters, spaces, hyphens, apostrophes, and dots.")
    return v


def validate_password(value: str) -> str:
    if len(value) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")
    if len(value) > 128:
        raise HTTPException(400, "Password must be at most 128 characters.")
    return value


def validate_salary(value: float, field: str = "Salary") -> float:
    if value <= 0:
        raise HTTPException(400, f"{field} must be a positive number.")
    if value > 10_000_000:
        raise HTTPException(400, f"{field} seems unreasonably large.")
    return value


def validate_price(value, field: str = "Price") -> float:
    if value is None:
        return value
    v = float(value)
    if v <= 0:
        raise HTTPException(400, f"{field} must be greater than zero.")
    if v > 10_000_000_000:
        raise HTTPException(400, f"{field} is unreasonably large.")
    return v


def validate_pincode(value: str) -> str:
    v = value.strip()
    if not re.fullmatch(r'\d{6}', v):
        raise HTTPException(400, "Pincode must be exactly 6 digits.")
    return v


def validate_build_year(value: int) -> int:
    if value < 1900 or value > 2030:
        raise HTTPException(400, "Build year must be between 1900 and 2030.")
    return value


def validate_size_sqft(value: float) -> float:
    if value <= 0 or value > 1_000_000:
        raise HTTPException(400, "Size must be between 1 and 1,000,000 sqft.")
    return value


def validate_bedrooms(value: int) -> int:
    if value < 0 or value > 50:
        raise HTTPException(400, "Bedrooms must be between 0 and 50.")
    return value


def validate_floors(value: int) -> int:
    if value < 1 or value > 200:
        raise HTTPException(400, "Floors must be between 1 and 200.")
    return value
