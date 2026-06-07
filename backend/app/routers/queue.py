import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.queue import QueueCreate, QueueUpdate, QueueResponse
from app.services import queue_service
from app.core.dependencies import get_current_user

router = APIRouter(prefix="/queues", tags=["Queues"])

@router.post("", response_model=QueueResponse, status_code=status.HTTP_201_CREATED)
async def create_queue(
    data: QueueCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await queue_service.create_new_queue(db, data, current_user)

@router.get("", response_model=list[QueueResponse])
async def get_all_queues(db: AsyncSession = Depends(get_db)):
    return await queue_service.get_all_queues(db)

@router.get("/{queue_id}", response_model=QueueResponse)
async def get_queue(queue_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    return await queue_service.get_queue(db, queue_id)

@router.patch("/{queue_id}", response_model=QueueResponse)
async def update_queue(
    queue_id: uuid.UUID, 
    data: QueueUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await queue_service.update_existing_queue(db, queue_id, data, current_user)

@router.delete("/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_queue(
    queue_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await queue_service.delete_existing_queue(db, queue_id, current_user)

