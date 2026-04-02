import express, { Request, Response } from 'express';
import OpenAI from 'openai';

const router = express.Router();

// Lazy-init so the key is read after dotenv has loaded
function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PlanPOI {
  id: string;
  name: string;
  category: string;
  tier: number;
  region: string;
  address?: string;
  hours?: string;
  price?: string;
  lat: number;
  lng: number;
}

interface PlanSlot {
  poiId: string;
  poiName: string;
  startTime: string;
  endTime: string;
  notes?: string;
  done: boolean;
}

interface DayPlan {
  date: string;
  label: string;
  slots: PlanSlot[];
}

// ─── POST /api/planner/generate ──────────────────────────────────────────────
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { zone, dates, startHour, endHour, pois } = req.body as {
      zone: string;
      dates: string[];
      startHour: string;
      endHour: string;
      pois: PlanPOI[];
    };

    if (!dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ error: 'dates array is required' });
    }

    const openai = getOpenAI();

    // Compact POI list for the prompt (trim to essential fields)
    const poisText = (pois || [])
      .map(
        (p) =>
          `[${p.id}] "${p.name}" | ${p.category} | tier ${p.tier} | ${p.region} | ${p.address || ''} | hours: ${p.hours || 'flexible'} | price: ${p.price || '?'} | coords: ${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
      )
      .join('\n');

    const dayCount = dates.length;
    const start = startHour || '09:00';
    const end = endHour || '21:00';

    const systemPrompt = `You are an expert Los Angeles travel planner who creates realistic, geographically efficient daily itineraries.

PLANNING RULES:
1. Daily hours: ${start} – ${end}
2. Cluster geographically close places on the same day to minimise LA driving time
3. Add 15–45 min travel time between locations (LA traffic is real)
4. Meals: place restaurants at logical times (lunch 12:00–14:00, dinner 18:30–21:00)
5. Time per venue: restaurants 90 min, viewpoints 30–45 min, landmarks 60–120 min, experiences 2–4 h
6. Select 3–5 attractions + 1–2 restaurants per day
7. Prefer tier 1 and tier 2 venues over tier 3+
8. ONLY use places from the provided list — do NOT invent new places
9. Every slot must have both startTime and endTime in HH:MM format

OUTPUT FORMAT (JSON object, nothing else):
{
  "days": [
    {
      "date": "YYYY-MM-DD",
      "label": "Day 1 — Thursday, April 3",
      "slots": [
        {
          "poiId": "exact-poi-id-from-list",
          "poiName": "Exact Name",
          "startTime": "09:30",
          "endTime": "11:00",
          "notes": "Optional tip for this visit",
          "done": false
        }
      ]
    }
  ]
}`;

    const userPrompt = `Plan a ${dayCount}-day Los Angeles trip.

Accommodation / base zone: ${zone}
Dates: ${dates.join(', ')}
Daily window: ${start} – ${end}

Available places (use ONLY from this list):
${poisText}

Create an optimised ${dayCount}-day plan. Cluster nearby attractions on the same day to minimise travel. Include a lunch and dinner restaurant each day. Prioritise tier 1 venues.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(raw) as { days: DayPlan[] };
    res.json(result);
  } catch (err: any) {
    console.error('[planner/generate] error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to generate plan' });
  }
});

// ─── POST /api/planner/replan ─────────────────────────────────────────────────
router.post('/replan', async (req: Request, res: Response) => {
  try {
    const { completed, remaining, currentTime, currentDate } = req.body as {
      completed: string[];
      remaining: DayPlan[];
      currentTime: string;
      currentDate: string;
    };

    const openai = getOpenAI();

    const systemPrompt = `You are an expert LA travel planner helping a traveller who is running behind schedule.

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
}`;

    const userPrompt = `Current time: ${currentTime} on ${currentDate}
Completed POI IDs: ${(completed || []).join(', ') || 'none yet'}

Remaining schedule to reorganise:
${JSON.stringify(remaining, null, 2)}

Please reorganise the remaining (undone) slots so the schedule is realistic given the current time. Drop lower-priority items if needed to make the remaining days manageable.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.5,
    });

    const raw = completion.choices[0].message.content;
    if (!raw) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(raw) as { days: DayPlan[] };
    res.json(result);
  } catch (err: any) {
    console.error('[planner/replan] error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to replan' });
  }
});

export default router;
