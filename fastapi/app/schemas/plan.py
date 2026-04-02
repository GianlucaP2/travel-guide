import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.planner import DayPlan


class TripPlanResponse(BaseModel):
    id: uuid.UUID
    zone: str
    plan_data: dict
    start_hour: str
    end_hour: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TripPlanUpdate(BaseModel):
    plan_data: dict | None = None
    zone: str | None = None
