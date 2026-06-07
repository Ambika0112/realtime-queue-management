import uuid
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
import enum
class UserRole(enum.Enum):
  customer = "customer"
  operator = "operator"
  admin = "admin"
  
class User(Base):
  __tablename__ = "users"

  id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  full_name: Mapped[str] = mapped_column(String(100))
  phone_number: Mapped[str] = mapped_column(String(15), unique=True, nullable=False)
  hashed_password: Mapped[str] = mapped_column(String)

  role: Mapped[UserRole] = mapped_column(SAEnum(UserRole), default=UserRole.customer)
  is_active: Mapped[bool] = mapped_column(Boolean, default=True)
  created_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
  )
  updated_at: Mapped[datetime] = mapped_column(
      DateTime(timezone=True),
      default=lambda: datetime.now(timezone.utc),
      onupdate=lambda: datetime.now(timezone.utc),
  )


