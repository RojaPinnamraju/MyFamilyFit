from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config   import settings
from app.database import Base, engine
from app.routers  import auth, users, families, weights, workouts, meals, water, invitations, invites

import app.models  # noqa: registers all models with SQLAlchemy

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Family fitness and meal tracking API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        settings.APP_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(auth.router,        prefix=PREFIX)
app.include_router(users.router,       prefix=PREFIX)
app.include_router(families.router,    prefix=PREFIX)
app.include_router(invitations.router, prefix=PREFIX)
app.include_router(invites.router,     prefix=PREFIX)
app.include_router(weights.router,     prefix=PREFIX)
app.include_router(workouts.router,    prefix=PREFIX)
app.include_router(meals.router,       prefix=PREFIX)
app.include_router(water.router,       prefix=PREFIX)


@app.get("/")
def root():
    return {
        "app":  settings.APP_NAME,
        "docs": "/docs",
        "smtp": settings.smtp_configured,
    }


@app.get("/health")
def health():
    return {"status": "ok"}
