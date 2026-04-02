from pydantic import BaseModel


class FilterPreferences(BaseModel):
    categories: list[str] = []
    tiers: list[int] = []
    regions: list[str] = []
    search: str = ""


class PreferenceResponse(BaseModel):
    filters: FilterPreferences

    model_config = {"from_attributes": True}


class PreferenceUpdate(BaseModel):
    filters: FilterPreferences
