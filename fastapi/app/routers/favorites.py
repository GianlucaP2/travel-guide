from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.favorite import Favorite
from app.models.poi import POI
from app.models.user import User
from app.schemas.favorite import FavoriteResponse
from app.schemas.poi import POIResponse

router = APIRouter()


@router.get("/", response_model=list[FavoriteResponse])
async def list_favorites(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Favorite)
        .options(joinedload(Favorite.poi))
        .where(Favorite.user_id == user.id)
        .order_by(Favorite.created_at.desc())
    )
    favs = result.scalars().all()
    return [
        FavoriteResponse(
            id=f.id,
            poi_id=f.poi_id,
            poi=POIResponse.from_orm_model(f.poi) if f.poi else None,
            created_at=f.created_at,
        )
        for f in favs
    ]


@router.post("/{poi_id}", status_code=status.HTTP_201_CREATED, response_model=FavoriteResponse)
async def add_favorite(
    poi_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Check POI exists
    poi_result = await db.execute(select(POI).where(POI.id == poi_id))
    poi = poi_result.scalar_one_or_none()
    if not poi:
        raise HTTPException(status_code=404, detail="POI not found")

    # Check duplicate
    existing = await db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.poi_id == poi_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Already favorited")

    fav = Favorite(user_id=user.id, poi_id=poi_id)
    db.add(fav)
    await db.commit()
    await db.refresh(fav)
    return FavoriteResponse(
        id=fav.id,
        poi_id=fav.poi_id,
        poi=POIResponse.from_orm_model(poi),
        created_at=fav.created_at,
    )


@router.delete("/{poi_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_favorite(
    poi_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Favorite).where(Favorite.user_id == user.id, Favorite.poi_id == poi_id)
    )
    fav = result.scalar_one_or_none()
    if not fav:
        raise HTTPException(status_code=404, detail="Favorite not found")
    await db.delete(fav)
    await db.commit()
