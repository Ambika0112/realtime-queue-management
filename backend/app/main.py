from contextlib import asynccontextmanager
from fastapi import FastAPI
from sqlalchemy import text
from app.config import settings
from app.database import engine

@asynccontextmanager
async def lifespan(app: FastAPI):
  print(f"starting {settings.APP_NAME}...")
  yield
  await engine.dispose()
  print("Shutdown complete.")

app = FastAPI(
  title=settings.APP_NAME,
  version="0.1.0",
  lifespan=lifespan,
)

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
