from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.queue_entry import QueueEntry, EntryStatus
import uuid

async def create_entry(db: AsyncSession, entry: QueueEntry) -> QueueEntry:
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry

async def get_active_entry_for_user(db: AsyncSession, queue_id: uuid.UUID, user_id: uuid.UUID) -> QueueEntry | None:
    result = await db.execute(
        select(QueueEntry).where(
            QueueEntry.queue_id == queue_id,
            QueueEntry.user_id == user_id,
            QueueEntry.status.in_([EntryStatus.waiting, EntryStatus.serving])
        )
    )
    return result.scalar_one_or_none()

async def get_max_token_for_queue(db: AsyncSession, queue_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.max(QueueEntry.token_number)).where(QueueEntry.queue_id == queue_id)
    )
    max_token = result.scalar()
    return max_token if max_token is not None else 0

async def update_entry(db: AsyncSession, entry: QueueEntry, update_data: dict) -> QueueEntry:
    for field, value in update_data.items():
        setattr(entry, field, value)
    await db.commit()
    await db.refresh(entry)
    return entry

async def get_currently_serving_entry(db: AsyncSession, queue_id: uuid.UUID) -> QueueEntry | None:
    result = await db.execute(
        select(QueueEntry).where(
            QueueEntry.queue_id == queue_id,
            QueueEntry.status == EntryStatus.serving
        )
    )
    return result.scalar_one_or_none()

async def get_next_waiting_entry(db: AsyncSession, queue_id: uuid.UUID) -> QueueEntry | None:
    result = await db.execute(
        select(QueueEntry)
        .where(
            QueueEntry.queue_id == queue_id,
            QueueEntry.status == EntryStatus.waiting
        )
        .order_by(QueueEntry.token_number.asc())
        .limit(1)
    )
    return result.scalar_one_or_none()
