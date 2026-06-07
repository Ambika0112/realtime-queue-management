from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status
from app.repositories.user_repo import get_user_by_phone, create_user
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.user import UserCreate
from app.models.user import User


async def register_user(db: AsyncSession, data: UserCreate) -> User:
    existing = await get_user_by_phone(db, data.phone_number)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone number already registered"
        )
    new_user = User(
        full_name=data.full_name,
        phone_number=data.phone_number,
        hashed_password=hash_password(data.password),
    )
    return await create_user(db, new_user)


async def login_user(db: AsyncSession, phone_number: str, password: str) -> dict:
    user = await get_user_by_phone(db, phone_number)
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone number or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled"
        )
    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return {"access_token": token, "token_type": "bearer"}
