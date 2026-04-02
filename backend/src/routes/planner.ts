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
  bestTime?: string;  // 'morning' | 'lunch' | 'afternoon' | 'sunset' | 'evening' | 'night'
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

// ─── Helper: extract JSON from Responses API output_text ─────────────────────
function extractJSON(text: string): string {
  // Strip markdown code fences if GPT wraps the JSON
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  // Otherwise find the outermost { … }
  const braced = text.match(/\{[\s\S]*\}/);
  if (braced) return braced[0];
  return text.trim();
}

// ─── POST /api/planner/generate ──────────────────────────────────────────────
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { zone, dates, startHour, endHour, nightLife, nightEndHour, pois } = req.body as {
      zone: string;
      dates: string[];
      startHour: string;
      endHour: string;
      nightLife?: boolean;
      nightEndHour?: string;
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
          `[${p.id}] "${p.name}" | ${p.category} | tier ${p.tier} | ${p.region} | hours: ${p.hours || 'flexible'} | best visit: ${p.bestTime || 'anytime'} | price: ${p.price || '?'} | coords: ${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
      )
      .join('\n');

    const dayCount = dates.length;
    const start = startHour || '09:00';
    const end = endHour || '21:00';
    const useNightLife = nightLife === true;
    const nightEnd = nightEndHour || '00:00';

    const nightLifeRules = useNightLife
      ? `
NIGHTLIFE PLANNING (ENABLED — plan dinner + after-dinner every day):
- Extended evening window: ${end} → ${nightEnd === '00:00' ? 'midnight' : nightEnd}
- Dinner: schedule a restaurant between 19:00–21:00 (90 min)
- After dinner (21:30 onwards): plan 1–2 bars, rooftop lounges, or cocktail bars from the list
- Bar/lounge slots: 60–90 min each
- Geographic proximity: after-dinner bars should be near the dinner venue to minimise late-night driving
- Use web search to verify tonight's hours for bars (some have restricted hours on certain days)
- For bars marked as "reservations required" in their tips, mention this in the slot notes
- Rooftop bars: prefer tier 1 (E.P. & L.P., The Penthouse, High Rooftop Erwin, The Roof EDITION)
- Speakeasies/classic bars: excellent for a nightcap (Tower Bar, Basement Tavern, Del Monte)
- Every evening must end no later than ${nightEnd === '00:00' ? '00:00' : nightEnd}`
      : `
DAYTIME ONLY: Daily hours end at ${end}. No bars or late-night venues.`;

    const webSearchInstructions = `
WEB SEARCH INSTRUCTIONS (you have internet access):
- Search for current events, concerts, festivals, or special exhibitions in LA on each specific date
- Verify that restaurants and bars are currently open and check for seasonal hours
- Look for any current events at venues on the specific dates (e.g. "Griffith Observatory events April 3 2025")
- Note any relevant current-events context in slot "notes" fields (e.g. "This week: Art Night at LACMA")
- If a venue has temporarily closed or changed hours, swap it for an alternative from the list`;

    const systemPrompt = `You are an expert Los Angeles travel planner who creates realistic, geographically efficient daily itineraries. You have access to the web and should use it to verify current hours, find current events, and look up sunset times.

PLANNING RULES:
1. Daily sightseeing hours: ${start} – ${end}
2. Cluster geographically close places on the same day to minimise LA driving time
3. Add 15–45 min travel time between locations (LA traffic is real)
4. Meals: lunch 12:00–14:00 (90 min); dinner 19:00–21:00 (90 min) when nightlife is enabled, otherwise 18:30–20:30
5. Time per venue: restaurants 90 min, viewpoints 30–45 min, landmarks 60–120 min, experiences 2–4 h, bars 60–90 min
6. Select 3–5 daytime attractions + 1 lunch + dinner + (if nightlife) 1–2 evening bars
7. Prefer tier 1 and tier 2 venues over tier 3+
8. ONLY use places from the provided list — do NOT invent new places
9. Every slot must have both startTime and endTime in HH:MM (24h) format

TIMING OPTIMIZATION (CRITICAL — must be strictly respected):
Each POI in the list has a "best visit" time. This is NOT optional — it reflects when the venue is genuinely best:
- "morning": Schedule before 12:00. Reason: cooler temps, sunrise light, no crowds. Examples: hiking trails, bakeries, quiet parks.
- "lunch": Schedule 12:00–14:00. Classic daytime dining.
- "afternoon": Schedule 13:00–17:00. Best light or opening hours favour this window.
- "sunset": USE WEB SEARCH to find the exact sunset time for each travel date in Los Angeles. Then schedule the venue to START 45–60 min before sunset. This is non-negotiable for Venice Beach boardwalk, Santa Monica Pier, Malibu beaches, and rooftop bars — they are dramatically better at golden hour. Plan the day so the afternoon flows naturally toward the sunset location.
- "evening": Schedule at 19:00 or later. Venue comes alive after dark.
- "night": Schedule at 21:00 or later. Night-only or best-after-dark venue.
- "anytime": Flexible — fill remaining slots.

TIMING ENFORCEMENT EXAMPLES:
✓ Venice Beach 18:00–19:30 (before ~19:30 sunset in spring) = CORRECT
✗ Venice Beach 10:00–11:30 = WRONG — boardwalk lacks magic in harsh morning light
✓ Griffith Observatory 20:00–22:00 = CORRECT — city lights + telescope after dark
✗ Griffith Observatory 09:30–11:00 = WRONG — misses the entire point of going at dusk
✓ LACMA Urban Light 19:30–21:00 = CORRECT — the lamp posts are spectacular at dusk/night
✗ LACMA Urban Light 11:00–12:30 = WRONG — just looks like street furniture in daytime
✓ Runyon Canyon 08:00–09:30 = CORRECT — cool air, sunrise, peaceful
✗ Runyon Canyon 14:00–15:30 = WRONG — midday heat, crowded, no views worth it
✓ Mulholland Drive 19:00–20:30 = CORRECT — city lights coming on at dusk
✓ The Broad Museum 11:00–12:30 = CORRECT — first thing in the day beats the afternoon queues
✓ Sqirl / Gjusta breakfast spot 09:00–10:30 = CORRECT — closes early, morning-only vibe

SUNSET PLANNING WORKFLOW:
1. Web-search the sunset time for LA on each specific travel date
2. Work backwards from sunset: place the main sunset venue starting ~1h before sunset
3. Place preceding afternoon activities so they end 30 min before the sunset departure
4. If doing nightlife: rooftop bars are ideal to CONTINUE from sunset into early evening (they are listed as "sunset" or "evening")
${nightLifeRules}
${webSearchInstructions}

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences, no commentary:
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
          "notes": "Optional tip or current-events note",
          "done": false
        }
      ]
    }
  ]
}`;

    const userPrompt = `Plan a ${dayCount}-day Los Angeles trip.

Accommodation / base zone: ${zone}
Dates: ${dates.join(', ')}
Daily sightseeing window: ${start} – ${end}${useNightLife ? `\nNightlife window: ${end} – ${nightEnd === '00:00' ? 'midnight' : nightEnd}` : ''}
Nightlife planning: ${useNightLife ? 'YES — include dinner + bars/rooftops each evening' : 'NO — daytime only'}

Please use web search to:
1. Check for current events in LA on these specific dates
2. Verify opening hours for the venues you select
3. Note anything relevant in the slot notes

Available places (use ONLY from this list):
${poisText}

Create an optimised ${dayCount}-day plan. Cluster nearby attractions on the same day to minimise travel. Include lunch every day.${useNightLife ? ' Include dinner + 1–2 evening bar/rooftop stops every day.' : ''} Prioritise tier 1 venues. Return only the JSON object.`;

    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
    });

    const rawText = response.output_text;
    if (!rawText) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(extractJSON(rawText)) as { days: DayPlan[] };
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

    const systemPrompt = `You are an expert LA travel planner helping a traveller who is running behind schedule. You have access to the web and can use it to check current venue hours.

RULES:
1. Reschedule the remaining (undone) slots to fit within the current and remaining days
2. If today is tight, push lower-priority slots (higher tier number) to later days or drop them
3. Keep restaurant slots — eating is non-negotiable. Keep bar slots if nightlife was originally planned for the evening
4. Use realistic 15–45 min travel time between locations
5. Preserve all existing poiId and poiName values exactly
6. Set done: false for all rescheduled slots
7. Return only a valid JSON object, no markdown fences

OUTPUT FORMAT:
{
  "days": [ ... DayPlan objects with rescheduled slots ... ]
}`;

    const userPrompt = `Current time: ${currentTime} on ${currentDate}
Completed POI IDs: ${(completed || []).join(', ') || 'none yet'}

Remaining schedule to reorganise:
${JSON.stringify(remaining, null, 2)}

Please reorganise the remaining (undone) slots so the schedule is realistic given the current time. Drop lower-priority daytime items if needed to make the remaining days manageable. Keep evening dinner and bar slots if they are still achievable. Return only the JSON object.`;

    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input: [
        { role: 'system' as const, content: systemPrompt },
        { role: 'user' as const, content: userPrompt },
      ],
    });

    const rawText = response.output_text;
    if (!rawText) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(extractJSON(rawText)) as { days: DayPlan[] };
    res.json(result);
  } catch (err: any) {
    console.error('[planner/replan] error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to replan' });
  }
});

export default router;
