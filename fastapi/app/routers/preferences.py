from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.user import User
from app.models.user_preference import UserPreference
from app.schemas.preference import PreferenceResponse, PreferenceUpdate

router = APIRouter()


@router.get("/", response_model=PreferenceResponse)
async def get_preferences(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    pref = result.scalar_one_or_none()
    if not pref:
        return PreferenceResponse(filters={"categories": [], "tiers": [], "regions": [], "search": ""})
    return PreferenceResponse(filters=pref.filters)


@router.put("/", response_model=PreferenceResponse)
async def update_preferences(
    body: PreferenceUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(UserPreference).where(UserPreference.user_id == user.id))
    pref = result.scalar_one_or_none()
    if pref:
        pref.filters = body.filters.model_dump()
    else:
        pref = UserPreference(user_id=user.id, filters=body.filters.model_dump())
        db.add(pref)
    await db.commit()
    await db.refresh(pref)
    return PreferenceResponse(filters=pref.filters)
