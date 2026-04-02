"""Seed POIs from JSON into the database."""
import asyncio
import json
from pathlib import Path

from sqlalchemy import select

from app.database import async_session, engine
from app.models import Base
from app.models.poi import POI


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    data_path = Path(__file__).parent / "pois.json"
    with open(data_path) as f:
        pois_data = json.load(f)

    async with async_session() as db:
        # Check if already seeded
        result = await db.execute(select(POI).limit(1))
        if result.scalar_one_or_none():
            print(f"POIs already seeded, skipping.")
            return

        for p in pois_data:
            poi = POI(
                id=p["id"],
                name=p["name"],
                category=p["category"],
                tier=p["tier"],
                lat=p["lat"],
                lng=p["lng"],
                description=p["description"],
                tips=p.get("tips"),
                address=p.get("address"),
                hours=p.get("hours"),
                price=p.get("price"),
                tags=p.get("tags"),
                region=p["region"],
                distance_from_sf=p.get("distanceFromSF"),
            )
            db.add(poi)

        await db.commit()
        print(f"Seeded {len(pois_data)} POIs.")


if __name__ == "__main__":
    asyncio.run(seed())
