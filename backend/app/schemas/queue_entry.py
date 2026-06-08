import uuid
from datetime import datetime
from pydantic import BaseModel
from app.models.queue_entry import EntryStatus

class QueueEntryUpdate(BaseModel):
    status: EntryStatus

class QueueEntryResponse(BaseModel):
    id: uuid.UUID
    queue_id: uuid.UUID
    user_id: uuid.UUID
    token_number: int
    status: EntryStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

class QueueEntryStatusResponse(QueueEntryResponse):
    people_ahead: int

class UserBasicResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    phone_number: str
    
    model_config = {"from_attributes": True}

class QueueEntryWithUserResponse(QueueEntryResponse):
    user: UserBasicResponse
