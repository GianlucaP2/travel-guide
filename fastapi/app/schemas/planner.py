from pydantic import BaseModel


class PlanPOI(BaseModel):
    id: str
    name: str
    category: str
    tier: int
    region: str
    address: str | None = None
    hours: str | None = None
    price: str | None = None
    lat: float
    lng: float


class PlanSlot(BaseModel):
    poiId: str
    poiName: str
    startTime: str
    endTime: str
    notes: str | None = None
    done: bool = False


class DayPlan(BaseModel):
    date: str
    label: str
    slots: list[PlanSlot]


class GenerateRequest(BaseModel):
    zone: str
    dates: list[str]
    startHour: str = "09:00"
    endHour: str = "21:00"
    pois: list[PlanPOI]


class ReplanRequest(BaseModel):
    completed: list[str]
    remaining: list[DayPlan]
    currentTime: str
    currentDate: str


class PlanResponse(BaseModel):
    days: list[DayPlan]
