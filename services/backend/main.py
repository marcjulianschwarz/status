import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import auth.auth_router
import services.services_router
from config.config import settings
from logging_config import MyLogger, create_logger, setup_logging

_ = setup_logging(level=logging.INFO)

# Configure logger filters (optional)
# Uncomment to block specific loggers from console output:
MyLogger.ignored_console_contexts = ["AuthService", "UserService"]

# Uncomment to ONLY allow specific loggers (allowlist mode):
# MyLogger.allowed_console_contexts = ["apn.apn_service", "DB", "reminder"]

MyLogger.show_records = os.getenv("ENV") != "production"  # Hide in production
# MyLogger.include_default_attributes_for_debug = True


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    # Startup
    logger = create_logger(__name__)
    logger.info("Starting background task: ...")
    # task = asyncio.create_task()
    logger.info(f"Task started. Checking every {'x'} seconds")
    yield

    # Shutdown: cleanup if needed
    logger.info("Shutting down background tasks")
    # _ = task.cancel()
    try:
        pass
        # await task
    except asyncio.CancelledError:
        logger.info("Task stopped")


app = FastAPI(
    title="API",
    description="",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    root_path="/api",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        settings.FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.auth_router.router)
app.include_router(services.services_router.router)


@app.get("/")
def read_root():
    return "API running"
