import asyncio
from logging.config import fileConfig
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Alembic Config object — provides access to alembic.ini
config = context.config

# Set up Python logging from alembic.ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# ── Import our models so Alembic can see all the tables ──────────────────────
from app.database import Base
from app.models import user, queue, queue_entry  # registers all models with Base
target_metadata = Base.metadata

# ── Read the DATABASE_URL from environment (same as our app) ─────────────────
import os
from dotenv import load_dotenv
load_dotenv()  # loads the .env file from the working directory
db_url = os.environ.get("DATABASE_URL", "")
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

config.set_main_option("sqlalchemy.url", db_url)


# ─────────────────────────────────────────────────────────────────────────────
# OFFLINE MODE: generates SQL without connecting to the DB (useful for review)
# ─────────────────────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


# ─────────────────────────────────────────────────────────────────────────────
# ONLINE MODE: connects to the real DB and applies changes
# ─────────────────────────────────────────────────────────────────────────────

# This is a SYNC helper — called via run_sync() so it works inside an async engine
def do_run_migrations(connection):
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    # async with — because the engine is async
    async with connectable.connect() as connection:
        # run_sync — bridges async connection into sync Alembic context
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


# ─────────────────────────────────────────────────────────────────────────────
if context.is_offline_mode():
    run_migrations_offline()
else:
    # asyncio.run() — needed to actually execute our async function
    asyncio.run(run_migrations_online())
