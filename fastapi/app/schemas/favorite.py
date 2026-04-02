import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.poi import POIResponse


class FavoriteResponse(BaseModel):
    id: uuid.UUID
    poi_id: str
    poi: POIResponse | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
