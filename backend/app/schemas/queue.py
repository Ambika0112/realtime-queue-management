import uuid
from datetime import datetime, date
from typing import Optional
from pydantic import BaseModel
from app.models.queue import QueueStatus


class QueueCreate(BaseModel):
    name: str
    description: Optional[str] = None      # Optional — not required from client
    max_capacity: Optional[int] = None     # Optional — None means unlimited


class QueueUpdate(BaseModel):
    # All optional — admin may only update one field at a time
    name: Optional[str] = None
    description: Optional[str] = None
    max_capacity: Optional[int] = None
    status: Optional[QueueStatus] = None


class QueueResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    status: QueueStatus
    current_token: int
    last_reset_date: Optional[date]
    max_capacity: Optional[int]
    created_by: uuid.UUID
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
