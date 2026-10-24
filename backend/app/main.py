from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.ai.errors import AIModelUnavailableError
from app.api.v1 import auth, admin, teacher, attendance, student, leaves, reports, approvals
from app.core.config import settings
from app.database.base import Base
from app.database.migrations import run_migrations
from app.database.session import engine


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Prepare the database when the server starts."""
    # 1. Create any table that does not exist yet.
    Base.metadata.create_all(bind=engine)
    # 2. Apply the hand-written migrations for tables that already exist.
    run_migrations(engine)
    print(f"[{settings.PROJECT_NAME}] Database schemas synchronized successfully.")
    yield
    print(f"[{settings.PROJECT_NAME}] Shutting down.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Allow the React frontend (and anything else) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AIModelUnavailableError)
async def ai_model_unavailable_handler(request: Request, exc: AIModelUnavailableError):
    """Answer with a clear 503 when a face model is not installed."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})


# Serve uploaded leave documents so teachers can open them.
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Every feature area lives in its own router file.
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administration"])
app.include_router(teacher.router, prefix=f"{settings.API_V1_STR}/teacher", tags=["Teacher & HOD"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["Attendance Sessions & AI"])
app.include_router(student.router, prefix=f"{settings.API_V1_STR}/student", tags=["Student Portal"])
app.include_router(leaves.router, prefix=f"{settings.API_V1_STR}/leaves", tags=["Leaves & OCR"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports & Analytics"])
app.include_router(approvals.router, prefix=f"{settings.API_V1_STR}/admin", tags=["HOD Approvals"])


@app.get("/")
def root():
    """A tiny health check so you can confirm the server is alive."""
    return {
        "system": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs"
    }
