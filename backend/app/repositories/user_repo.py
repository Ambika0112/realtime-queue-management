from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User

async def get_user_by_phone(db: AsyncSession, phone_number: str) -> User | None:
  result = await db.execute(
    select(User).where(User.phone_number == phone_number)   #SQL injection protection, Portability 

  )
  return result.scalar_one_or_none()

async def create_user(db: AsyncSession, user: User) -> User:
  db.add(user)
  await db.commit()
  await db.refresh(user)
  return user

