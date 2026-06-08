import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.queue import QueueCreate, QueueUpdate, QueueResponse
from app.services import queue_service
from app.core.dependencies import get_current_user
from app.schemas.queue_entry import QueueEntryResponse, QueueEntryStatusResponse, QueueEntryWithUserResponse, QueueEntryUpdate
from app.services import queue_entry_service
from fastapi import WebSocket, WebSocketDisconnect
from app.core.websockets import manager
from sqlalchemy import select, func
from app.models.queue_entry import QueueEntry, EntryStatus
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

@router.get("/me/active", response_model=list[uuid.UUID])
async def get_my_active_queues(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Returns a list of queue_ids where the user is currently waiting or serving
    query = select(QueueEntry.queue_id).where(
        QueueEntry.user_id == current_user.id,
        QueueEntry.status.in_([EntryStatus.waiting, EntryStatus.serving])
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/me/history")
async def get_my_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from sqlalchemy.orm import joinedload
    query = select(QueueEntry).options(joinedload(QueueEntry.queue)).where(
        QueueEntry.user_id == current_user.id,
        QueueEntry.status.in_([EntryStatus.completed, EntryStatus.skipped, EntryStatus.left])
    ).order_by(QueueEntry.created_at.desc())
    
    result = await db.execute(query)
    entries = result.scalars().all()
    # Serialize manually or create a new response schema
    return [{
        "id": e.id,
        "queue_name": e.queue.name,
        "token_number": e.token_number,
        "status": e.status.value,
        "created_at": e.created_at,
        "served_at": e.served_at,
        "resolved_at": e.resolved_at
    } for e in entries]

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


@router.post("/{queue_id}/join", response_model=QueueEntryStatusResponse, status_code=status.HTTP_201_CREATED)
async def join_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    entry = await queue_entry_service.join_queue(db, queue_id, current_user)
    
    count_query = select(func.count(QueueEntry.id)).where(
        QueueEntry.queue_id == queue_id,
        QueueEntry.status == EntryStatus.waiting,
        QueueEntry.token_number < entry.token_number
    )
    count_result = await db.execute(count_query)
    people_ahead = count_result.scalar() or 0
    
    setattr(entry, "people_ahead", people_ahead)
    return entry

@router.post("/{queue_id}/leave", response_model=QueueEntryResponse)
async def leave_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await queue_entry_service.leave_queue(db, queue_id, current_user)


@router.get("/{queue_id}/my-token", response_model=QueueEntryStatusResponse)
async def get_my_token(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = select(QueueEntry).where(
        QueueEntry.queue_id == queue_id,
        QueueEntry.user_id == current_user.id,
        QueueEntry.status == EntryStatus.waiting
    )
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No active token found")
        
    # Calculate people ahead
    count_query = select(func.count(QueueEntry.id)).where(
        QueueEntry.queue_id == queue_id,
        QueueEntry.status == EntryStatus.waiting,
        QueueEntry.token_number < entry.token_number
    )
    count_result = await db.execute(count_query)
    people_ahead = count_result.scalar() or 0
    
    setattr(entry, "people_ahead", people_ahead)
    return entry

@router.post("/{queue_id}/advance")
async def advance_queue(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return await queue_entry_service.advance_queue(db, queue_id, current_user)


@router.websocket("/{queue_id}/ws")
async def websocket_endpoint(websocket: WebSocket, queue_id: uuid.UUID):
    await manager.connect(websocket, queue_id)
    try:
        while True:
            # Keep the connection alive — just wait for the client to send anything
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, queue_id)

@router.get("/{queue_id}/entries", response_model=list[QueueEntryWithUserResponse])
async def get_queue_entries(
    queue_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ["admin", "operator"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
        
    # We use joinedload to eagerly load the user relationship so Pydantic can read it
    from sqlalchemy.orm import joinedload
    query = select(QueueEntry).options(joinedload(QueueEntry.user)).where(
        QueueEntry.queue_id == queue_id,
        QueueEntry.status.in_([EntryStatus.waiting, EntryStatus.serving])
    ).order_by(QueueEntry.token_number.asc())
    
    result = await db.execute(query)
    return result.scalars().all()

from datetime import datetime, timezone

@router.patch("/{queue_id}/entries/{entry_id}", response_model=QueueEntryResponse)
async def update_queue_entry_status(
    queue_id: uuid.UUID,
    entry_id: uuid.UUID,
    data: QueueEntryUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ["admin", "operator"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
        
    query = select(QueueEntry).where(QueueEntry.id == entry_id, QueueEntry.queue_id == queue_id)
    result = await db.execute(query)
    entry = result.scalar_one_or_none()
    
    if not entry:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Entry not found")
        
    entry.status = data.status
    if data.status in [EntryStatus.completed, EntryStatus.skipped, EntryStatus.left]:
        entry.resolved_at = datetime.now(timezone.utc)
    elif data.status == EntryStatus.serving:
        entry.served_at = datetime.now(timezone.utc)
        
    await db.commit()
    await db.refresh(entry)
    
    # Broadcast to all clients that an update happened
    await manager.broadcast_to_queue(queue_id, {"type": "QUEUE_UPDATE", "current_token": entry.token_number})
    
    return entry

@router.get("/admin/history")
async def get_admin_history(
    queue_id: uuid.UUID | None = None,
    status: EntryStatus | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role.value not in ["admin", "operator"]:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied")
        
    from sqlalchemy.orm import joinedload
    query = select(QueueEntry).options(joinedload(QueueEntry.user), joinedload(QueueEntry.queue))
    
    # Filters
    if queue_id:
        query = query.where(QueueEntry.queue_id == queue_id)
    if status:
        query = query.where(QueueEntry.status == status)
    else:
        # Default to only historical (terminal) statuses if no status provided
        query = query.where(QueueEntry.status.in_([EntryStatus.completed, EntryStatus.skipped, EntryStatus.left]))
        
    query = query.order_by(QueueEntry.created_at.desc()).limit(100)
    
    result = await db.execute(query)
    entries = result.scalars().all()
    
    return [{
        "id": e.id,
        "queue_name": e.queue.name,
        "user_name": e.user.full_name,
        "token_number": e.token_number,
        "status": e.status.value,
        "created_at": e.created_at,
        "served_at": e.served_at,
        "resolved_at": e.resolved_at
    } for e in entries]
