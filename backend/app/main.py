from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.database.base import Base
from app.database.session import engine
from app.api.v1 import auth, admin, teacher, attendance, student, leaves, reports

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure all relational database tables exist
    Base.metadata.create_all(bind=engine)
    print(f"[{settings.PROJECT_NAME}] Database schemas synchronized successfully.")
    yield
    # Shutdown
    print(f"[{settings.PROJECT_NAME}] Shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploaded files directory for document inspection
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include Modular API Routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}/auth", tags=["Authentication"])
app.include_router(admin.router, prefix=f"{settings.API_V1_STR}/admin", tags=["Administration"])
app.include_router(teacher.router, prefix=f"{settings.API_V1_STR}/teacher", tags=["Teacher & HOD"])
app.include_router(attendance.router, prefix=f"{settings.API_V1_STR}/attendance", tags=["Attendance Sessions & AI"])
app.include_router(student.router, prefix=f"{settings.API_V1_STR}/student", tags=["Student Portal"])
app.include_router(leaves.router, prefix=f"{settings.API_V1_STR}/leaves", tags=["Leaves & OCR"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["Reports & Analytics"])

@app.get("/")
def root():
    return {
        "system": settings.PROJECT_NAME,
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs"
    }
