import re
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, pois, planner, favorites, preferences, users, health, plans


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Highway 1 Travel Guide API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(pois.router, prefix="/api/pois", tags=["pois"])
app.include_router(planner.router, prefix="/api/planner", tags=["planner"])
app.include_router(favorites.router, prefix="/api/favorites", tags=["favorites"])
app.include_router(preferences.router, prefix="/api/preferences", tags=["preferences"])
app.include_router(plans.router, prefix="/api/plans", tags=["plans"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(health.router, prefix="/api", tags=["health"])
