from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from app.config import settings
from app.database import engine
from app.routers.auth import router as auth_router
from app.routers.queue import router as queue_router


@asynccontextmanager
async def lifespan(app: FastAPI):
  print(f"starting {settings.APP_NAME}...")

  print("Database managed by Alembic.")

  

  yield
  await engine.dispose()
  print("Shutdown complete.")

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
  title=settings.APP_NAME,
  version="0.1.0",
  lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(queue_router)


# "Hey QueueFlow, are you alive? Is your database alive too?"
@app.get("/health")
async def health_check():
  try:
    async with engine.connect() as conn:
      await conn.execute(text("SELECT 1"))
    db_status = "connected"
  except Exception as e:
    db_status = f"error: {str(e)}"

  return {
    "status": "ok",
    "app": settings.APP_NAME,
    "environment": settings.APP_ENV,
    "db": db_status
  }
