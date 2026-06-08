from datetime import datetime, timezone
import uuid
import enum
from sqlalchemy import Enum as SAEnum, Integer, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class EntryStatus(enum.Enum):
    waiting = "waiting"
    serving = "serving"
    completed = "completed"
    skipped = "skipped"
    left = "left"

class QueueEntry(Base):
    __tablename__ = "queue_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    queue_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("queues.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    user: Mapped["User"] = relationship("User")
    queue: Mapped["Queue"] = relationship("Queue")
    
    token_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[EntryStatus] = mapped_column(SAEnum(EntryStatus), default=EntryStatus.waiting)

    served_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
