from pydantic import BaseModel
from typing import Any, Optional

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Any] = None

class ErrorResponse(BaseModel):
    detail: str
