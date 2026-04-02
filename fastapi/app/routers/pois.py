from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.poi import POI
from app.schemas.poi import POIResponse

router = APIRouter()


@router.get("/", response_model=list[POIResponse])
async def get_all_pois(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(POI).order_by(POI.distance_from_sf))
    pois = result.scalars().all()
    return [POIResponse.from_orm_model(p) for p in pois]


@router.get("/region/{region}", response_model=list[POIResponse])
async def get_pois_by_region(region: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(POI).where(POI.region.ilike(region)).order_by(POI.distance_from_sf)
    )
    pois = result.scalars().all()
    return [POIResponse.from_orm_model(p) for p in pois]


@router.get("/tier/{tier}", response_model=list[POIResponse])
async def get_pois_by_tier(tier: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(POI).where(POI.tier == tier).order_by(POI.distance_from_sf)
    )
    pois = result.scalars().all()
    return [POIResponse.from_orm_model(p) for p in pois]


@router.get("/category/{category}", response_model=list[POIResponse])
async def get_pois_by_category(category: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(POI).where(POI.category == category).order_by(POI.distance_from_sf)
    )
    pois = result.scalars().all()
    return [POIResponse.from_orm_model(p) for p in pois]
