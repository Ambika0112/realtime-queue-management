from datetime import datetime, date, timezone
import uuid
import enum

# Added: UUID (was missing), DateTime, Date, ForeignKey, Integer
from sqlalchemy import Enum as SAEnum, String, Integer, Text, DateTime, Date, ForeignKey
from sqlalchemy.dialects.postgresql import UUID  # Added: was missing entirely
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


class QueueStatus(enum.Enum):  # Renamed: QueueCurrentStatus → QueueStatus (cleaner)
    active = "active"
    paused = "paused"
    disabled = "disabled"


class Queue(Base):
    __tablename__ = "queues"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name: Mapped[str] = mapped_column(String(100), nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[QueueStatus] = mapped_column(SAEnum(QueueStatus), default=QueueStatus.active)

    current_token: Mapped[int] = mapped_column(Integer, default=0)

    # Fixed: Date type (not DateTime), Mapped[date | None] because nullable
    last_reset_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Fixed: Mapped[int | None] because max_capacity is optional (None = unlimited)
    max_capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)

    # Added: was completely missing — FK to users table
    created_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
