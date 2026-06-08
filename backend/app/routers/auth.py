from app.models.user import User
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserCreate, UserLogin, UserResponse
from app.services.auth_service import register_user, login_user
from app.core.dependencies import get_current_user, rate_limit_login

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
  return await register_user(db, data)

@router.post("/login")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db), _: None = Depends(rate_limit_login)):
  return await login_user(db, data.phone_number, data.password)

@router.get("/me", response_model=UserResponse)
async def get_current_user_route(user: User = Depends(get_current_user)):
  return user
