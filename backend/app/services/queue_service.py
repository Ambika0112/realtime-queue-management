import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.queue import Queue
from app.models.user import User, UserRole
from app.schemas.queue import QueueCreate, QueueUpdate
from app.repositories import queue_repo

async def create_new_queue(db: AsyncSession, data: QueueCreate, current_user: User) -> Queue:
    if current_user.role != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create queues"
        )
    
    new_queue = Queue(
        name=data.name,
        description=data.description,
        max_capacity=data.max_capacity,
        created_by=current_user.id
    )
    return await queue_repo.create_queue(db, new_queue)

async def get_queue(db: AsyncSession, queue_id: uuid.UUID) -> Queue:
    queue = await queue_repo.get_queue_by_id(db, queue_id)
    if not queue:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found")
    return queue

async def get_all_queues(db: AsyncSession) -> list[Queue]:
    return await queue_repo.get_all_queues(db)

async def update_existing_queue(db: AsyncSession, queue_id: uuid.UUID, data: QueueUpdate, current_user: User) -> Queue:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can update queues")
        
    queue = await get_queue(db, queue_id)
    
    # Exclude unset fields so we only update what was provided
    update_data = data.model_dump(exclude_unset=True)
    return await queue_repo.update_queue(db, queue, update_data)

async def delete_existing_queue(db: AsyncSession, queue_id: uuid.UUID, current_user: User) -> Queue:
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can delete queues")
        
    queue = await get_queue(db, queue_id)
    return await queue_repo.delete_queue(db, queue)
