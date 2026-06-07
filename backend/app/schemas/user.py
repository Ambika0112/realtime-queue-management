import uuid
from pydantic import BaseModel, field_validator
import re
from app.models.user import UserRole

class UserCreate(BaseModel):
  full_name: str
  phone_number: str
  @field_validator("phone_number")
  @classmethod
  def validate_phone(cls, v):
    if not re.match(r"^\+?[0-9]{10,15}$", v):
      raise ValueError("Invalid phone number")
    return v
  password: str


class UserLogin(BaseModel):
    phone_number: str
    password: str


class UserResponse(BaseModel):
    id: uuid.UUID
    full_name: str
    phone_number: str
    role: UserRole
    is_active: bool


    model_config = {"from_attributes": True}