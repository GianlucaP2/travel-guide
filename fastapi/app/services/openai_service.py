import json

from openai import AsyncOpenAI

from app.config import settings
from app.schemas.planner import GenerateRequest, ReplanRequest


def _get_client() -> AsyncOpenAI:
    if not settings.openai_api_key:
        raise ValueError("OPENAI_API_KEY is not set")
    return AsyncOpenAI(api_key=settings.openai_api_key)


async def generate_plan(req: GenerateRequest) -> dict:
    client = _get_client()

    pois_text = "\n".join(
        f'[{p.id}] "{p.name}" | {p.category} | tier {p.tier} | {p.region} | {p.address or ""} | hours: {p.hours or "flexible"} | price: {p.price or "?"} | coords: {p.lat:.4f},{p.lng:.4f}'
        for p in req.pois
    )

    day_count = len(req.dates)
    start = req.startHour or "09:00"
    end = req.endHour or "21:00"

    system_prompt = f"""You are an expert Los Angeles travel planner who creates realistic, geographically efficient daily itineraries.

PLANNING RULES:
1. Daily hours: {start} – {end}
2. Cluster geographically close places on the same day to minimise LA driving time
3. Add 15–45 min travel time between locations (LA traffic is real)
4. Meals: place restaurants at logical times (lunch 12:00–14:00, dinner 18:30–21:00)
5. Time per venue: restaurants 90 min, viewpoints 30–45 min, landmarks 60–120 min, experiences 2–4 h
6. Select 3–5 attractions + 1–2 restaurants per day
7. Prefer tier 1 and tier 2 venues over tier 3+
8. ONLY use places from the provided list — do NOT invent new places
9. Every slot must have both startTime and endTime in HH:MM format

OUTPUT FORMAT (JSON object, nothing else):
{{
  "days": [
    {{
      "date": "YYYY-MM-DD",
      "label": "Day 1 — Thursday, April 3",
      "slots": [
        {{
          "poiId": "exact-poi-id-from-list",
          "poiName": "Exact Name",
          "startTime": "09:30",
          "endTime": "11:00",
          "notes": "Optional tip for this visit",
          "done": false
        }}
      ]
    }}
  ]
}}"""

    user_prompt = f"""Plan a {day_count}-day Los Angeles trip.

Accommodation / base zone: {req.zone}
Dates: {', '.join(req.dates)}
Daily window: {start} – {end}

Available places (use ONLY from this list):
{pois_text}

Create an optimised {day_count}-day plan. Cluster nearby attractions on the same day to minimise travel. Include a lunch and dinner restaurant each day. Prioritise tier 1 venues."""

    completion = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.7,
    )

    raw = completion.choices[0].message.content
    if not raw:
        raise ValueError("Empty response from GPT-4o")
    return json.loads(raw)


async def replan(req: ReplanRequest) -> dict:
    client = _get_client()

    system_prompt = """You are an expert LA travel planner helping a traveller who is running behind schedule.

RULES:
1. Reschedule the remaining (undone) slots to fit within the current and remaining days
2. If today is tight, push lower-priority slots (higher tier number) to later days or drop them
3. Keep restaurant slots — eating is non-negotiable
4. Use realistic 15–45 min travel time between locations
5. Preserve all existing poiId and poiName values exactly
6. Set done: false for all rescheduled slots
7. Return valid JSON only

OUTPUT FORMAT (same structure as the remaining input):
{
  "days": [ ... DayPlan objects with rescheduled slots ... ]
}"""

    remaining_json = json.dumps([d.model_dump() for d in req.remaining], indent=2)

    user_prompt = f"""Current time: {req.currentTime} on {req.currentDate}
Completed POI IDs: {', '.join(req.completed) if req.completed else 'none yet'}

Remaining schedule to reorganise:
{remaining_json}

Please reorganise the remaining (undone) slots so the schedule is realistic given the current time. Drop lower-priority items if needed to make the remaining days manageable."""

    completion = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.5,
    )

    raw = completion.choices[0].message.content
    if not raw:
        raise ValueError("Empty response from GPT-4o")
    return json.loads(raw)
