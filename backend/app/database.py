"""
Creates an engine — the connection pool to PostgreSQL. Think of it as the phone line between your app and the database. You create it once.

Creates a session factory — a session is one "conversation" with the DB. Open session → run queries → close session. The factory creates new sessions on demand.

Exposes get_db() — a FastAPI dependency. Every route that needs DB access will ask for a session using this function. FastAPI opens it, gives it to your route, then closes it automatically when the request is done.
"""

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(
  settings.DATABASE_URL,
  pool_pre_ping=True,
  echo=settings.APP_ENV == "development",
)

AsyncSessionLocal = async_sessionmaker(
  bind=engine,
  class_=AsyncSession,
  expire_on_commit=False,
)

class Base(DeclarativeBase):
  pass

async def get_db():
  async with AsyncSessionLocal() as session:
    yield session

