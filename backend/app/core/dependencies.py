from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError
from app.database import get_db
from app.core.security import decode_access_token
from app.repositories.user_repo import get_user_by_phone
from sqlalchemy import select
from app.models.user import User
import uuid
from app.core.redis_client import redis_client

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = decode_access_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def rate_limit_login(request: Request):
    # 1. Get the caller's IP address
    ip = request.client.host
    
    # 2. Build a unique key for this IP on this specific action
    key = f"rate_limit:login:{ip}"
    
    # 3. INCR — atomically adds 1 and returns the new value
    count = await redis_client.incr(key)
    
    # 4. First request — set the 60s expiry window
    if count == 1:
        await redis_client.expire(key, 60)
    
    # 5. Too many requests
    if count > 5:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please try again in a minute."
        )