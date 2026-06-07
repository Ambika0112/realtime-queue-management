from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.queue import Queue
import uuid

async def create_queue(db: AsyncSession, queue: Queue) -> Queue:
    db.add(queue)
    await db.commit()
    await db.refresh(queue)
    return queue

async def get_queue_by_id(db: AsyncSession, queue_id: uuid.UUID) -> Queue | None:
    result = await db.execute(
        select(Queue).where(Queue.id == queue_id)
    )
    return result.scalar_one_or_none()

async def get_all_queues(db: AsyncSession) -> list[Queue]:
    result = await db.execute(select(Queue))
    return list(result.scalars().all())

async def update_queue(db: AsyncSession, queue: Queue, queue_data: dict) -> Queue:
    for field, value in queue_data.items():
        setattr(queue, field, value)
    await db.commit()
    await db.refresh(queue)
    return queue


async def delete_queue(db: AsyncSession, queue: Queue) -> Queue:
    await db.delete(queue)
    await db.commit()
    return queue
