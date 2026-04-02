from sqlalchemy import String, SmallInteger, Float, Text, ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class POI(Base):
    __tablename__ = "pois"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    tier: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    tips: Mapped[str | None] = mapped_column(Text, nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    hours: Mapped[str | None] = mapped_column(String(255), nullable=True)
    price: Mapped[str | None] = mapped_column(String(100), nullable=True)
    tags: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    region: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    distance_from_sf: Mapped[float | None] = mapped_column(Float, nullable=True)
