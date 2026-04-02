from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.middleware.auth import get_optional_user
from app.models.trip_plan import TripPlan
from app.models.user import User
from app.schemas.planner import GenerateRequest, PlanResponse, ReplanRequest
from app.services.openai_service import generate_plan, replan

router = APIRouter()


@router.post("/generate", response_model=PlanResponse)
async def generate(
    body: GenerateRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    if not body.dates:
        raise HTTPException(status_code=400, detail="dates array is required")

    try:
        result = await generate_plan(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Persist plan if user is authenticated
    if user:
        plan = TripPlan(
            user_id=user.id,
            zone=body.zone,
            plan_data=result,
            start_hour=body.startHour,
            end_hour=body.endHour,
        )
        db.add(plan)
        await db.commit()

    return result


@router.post("/replan", response_model=PlanResponse)
async def replan_route(
    body: ReplanRequest,
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    try:
        result = await replan(body)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
