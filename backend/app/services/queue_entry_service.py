import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.models.user import User
from app.models.queue_entry import QueueEntry, EntryStatus
from app.repositories import queue_entry_repo
from app.services.queue_service import get_queue
from app.repositories import queue_repo
from app.models.user import UserRole


async def join_queue(db: AsyncSession, queue_id: uuid.UUID, current_user: User) -> QueueEntry:
    # 1. Does the queue exist? (get_queue will throw a 404 if not)
    queue = await get_queue(db, queue_id)
    
    # 2. Is the queue active?
    if queue.status.value != "active":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Queue is not active")
        
    # 3. Is the user already in the queue?
    existing_entry = await queue_entry_repo.get_active_entry_for_user(db, queue_id, current_user.id)
    if existing_entry:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You are already in this queue")
        
    # 4. What is the next token number?
    max_token = await queue_entry_repo.get_max_token_for_queue(db, queue_id)
    next_token = max_token + 1
    
    # 5. Have we hit the maximum capacity?
    if queue.max_capacity and next_token > queue.max_capacity:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Queue is at maximum capacity")
        
    # 6. Everything is valid — create the entry!
    new_entry = QueueEntry(
        queue_id=queue_id,
        user_id=current_user.id,
        token_number=next_token,
        status=EntryStatus.waiting
    )
    
    return await queue_entry_repo.create_entry(db, new_entry)


async def leave_queue(db: AsyncSession, queue_id: uuid.UUID, current_user: User) -> QueueEntry:
    # Find the user's active entry in this queue
    entry = await queue_entry_repo.get_active_entry_for_user(db, queue_id, current_user.id)
    
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You are not active in this queue")
        
    # Change status to left
    return await queue_entry_repo.update_entry(db, entry, {"status": EntryStatus.left})


async def advance_queue(db: AsyncSession, queue_id: uuid.UUID, current_user: User) -> QueueEntry | dict:
    # Admin Check
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only admins can advance the queue")
        
    queue = await get_queue(db, queue_id)
    
    # 1. Complete the currently serving person
    current_serving = await queue_entry_repo.get_currently_serving_entry(db, queue_id)
    if current_serving:
        await queue_entry_repo.update_entry(db, current_serving, {"status": EntryStatus.completed})
        
    # 2. Find the next person
    next_waiting = await queue_entry_repo.get_next_waiting_entry(db, queue_id)
    
    if not next_waiting:
        return {"message": "The queue is empty!"}
        
    # 3. Mark the next person as serving
    await queue_entry_repo.update_entry(db, next_waiting, {"status": EntryStatus.serving})
    
    # 4. Update the Queue's current token so the whole hospital can see it on the screen
    await queue_repo.update_queue(db, queue, {"current_token": next_waiting.token_number})
    
    return next_waiting
