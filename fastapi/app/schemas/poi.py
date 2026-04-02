from pydantic import BaseModel


class POIResponse(BaseModel):
    id: str
    name: str
    category: str
    tier: int
    lat: float
    lng: float
    description: str
    tips: str | None = None
    address: str | None = None
    hours: str | None = None
    price: str | None = None
    tags: list[str] | None = None
    region: str
    distanceFromSF: float | None = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_model(cls, poi):
        return cls(
            id=poi.id,
            name=poi.name,
            category=poi.category,
            tier=poi.tier,
            lat=poi.lat,
            lng=poi.lng,
            description=poi.description,
            tips=poi.tips,
            address=poi.address,
            hours=poi.hours,
            price=poi.price,
            tags=poi.tags,
            region=poi.region,
            distanceFromSF=poi.distance_from_sf,
        )
