from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_current_user
from app.models.trip_plan import TripPlan
from app.models.user import User
from app.schemas.plan import TripPlanResponse, TripPlanUpdate

router = APIRouter()


@router.get("/", response_model=list[TripPlanResponse])
async def list_plans(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TripPlan).where(TripPlan.user_id == user.id).order_by(TripPlan.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{plan_id}", response_model=TripPlanResponse)
async def get_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TripPlan).where(TripPlan.id == plan_id, TripPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan


@router.put("/{plan_id}", response_model=TripPlanResponse)
async def update_plan(
    plan_id: UUID,
    body: TripPlanUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TripPlan).where(TripPlan.id == plan_id, TripPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    if body.plan_data is not None:
        plan.plan_data = body.plan_data
    if body.zone is not None:
        plan.zone = body.zone
    await db.commit()
    await db.refresh(plan)
    return plan


@router.delete("/{plan_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_plan(
    plan_id: UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(TripPlan).where(TripPlan.id == plan_id, TripPlan.user_id == user.id)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    await db.delete(plan)
    await db.commit()
