from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.poi import POI

router = APIRouter()


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(func.count()).select_from(POI))
    count = result.scalar()
    return {"status": "healthy", "pois": count}
