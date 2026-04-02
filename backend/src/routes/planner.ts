import express, { Request, Response } from 'express';
import OpenAI from 'openai';
import { POIS } from '../data/pois';

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
  tier: number;  // 0 = iconic must-see, 1 = top pick, 2 = recommended, 3-4 = worth visiting
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
    const { zone, dates, startHour, endHour, nightLife, nightEndHour, categories, budgetLevel, pois } = req.body as {
      zone: string;
      dates: string[];
      startHour: string;
      endHour: string;
      nightLife?: boolean;
      nightEndHour?: string;
      categories?: string[];
      budgetLevel?: number;
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
7. ONLY use places from the provided list — do NOT invent new places
8. Every slot must have both startTime and endTime in HH:MM (24h) format

TIER 0 — ICONIC MUST-SEES (highest priority):
- POIs marked "tier 0" are iconic landmarks that travellers MUST NOT miss
- Spread all tier 0 POIs across the trip — every tier 0 place MUST appear at least once
- If a tier 0 venue is in the list, include it. Do not skip or deprioritise it
- After tier 0, prefer tier 1 then tier 2

BUDGET GUIDANCE (budget level: ${budgetLevel ?? 3}/4):
- 1=Thrifty (Free/$), 2=Moderate ($$), 3=Comfortable ($$$), 4=Luxury ($$$$)
- The POI list has already been filtered to your budget — all included venues are within budget
- For restaurants, lean toward the lower-price options unless the user's budget is 3–4

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

Create an optimised ${dayCount}-day plan. Cluster nearby attractions on the same day to minimise travel. Include lunch every day.${useNightLife ? ' Include dinner + 1–2 evening bar/rooftop stops every day.' : ''} MUST include all tier 0 (iconic) venues. Then prioritise tier 1. Return only the JSON object.`;

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

// ─── POST /api/planner/swap ───────────────────────────────────────────────────
// Replace a single slot (or a set of slots) based on a natural-language prompt.
// Returns a replacement slot (same time window, different POI).
router.post('/swap', async (req: Request, res: Response) => {
  try {
    const { slot, date, daySlots, prompt, pois } = req.body as {
      slot: PlanSlot;                // the slot being replaced
      date: string;                  // "YYYY-MM-DD"
      daySlots: PlanSlot[];          // all slots on that day (context)
      prompt: string;                // e.g. "find something cheaper", "I want to meet people"
      pois: PlanPOI[];               // available candidates (not already in day)
    };

    if (!slot || !prompt || !pois) {
      return res.status(400).json({ error: 'slot, prompt and pois are required' });
    }

    const openai = getOpenAI();

    const candidatesText = pois
      .map(
        (p) =>
          `[${p.id}] "${p.name}" | ${p.category} | tier ${p.tier} | ${p.region} | hours: ${p.hours || 'flexible'} | best visit: ${p.bestTime || 'anytime'} | price: ${p.price || '?'} | coords: ${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
      )
      .join('\n');

    const dayContext = daySlots
      .filter((s) => s.poiId !== slot.poiId)
      .map((s) => `  ${s.startTime}–${s.endTime}: ${s.poiName}`)
      .join('\n') || '  (no other slots)';

    const systemPrompt = `You are an expert Los Angeles travel planner helping a traveller swap one item in their itinerary.

Your job: given the current slot and a user request, pick the BEST replacement from the candidate list.

RULES:
1. Pick exactly one POI from the candidate list — do NOT invent places
2. Keep the same time window (startTime and endTime) UNLESS the replacement venue has a different best-visit time that makes a minor shift necessary (max ±30 min)
3. Respect timing: if bestTime is "morning" keep it morning, "evening" keep it evening, etc.
4. Consider geographic proximity to the other slots on that day
5. Write a short "notes" field (1 sentence) explaining why this is a good swap`;

    const userPrompt = `Current slot to replace:
  ${slot.startTime}–${slot.endTime}: "${slot.poiName}"

User's request: "${prompt}"

Other slots on ${date}:
${dayContext}

Available replacement candidates (pick ONE):
${candidatesText}

Return ONLY a valid JSON object (no markdown):
{
  "poiId": "exact-id-from-list",
  "poiName": "Exact Name",
  "startTime": "${slot.startTime}",
  "endTime": "${slot.endTime}",
  "notes": "One sentence on why this is a great swap.",
  "done": false
}`;

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

    const result = JSON.parse(extractJSON(rawText)) as PlanSlot;
    res.json({ slot: result });
  } catch (err: any) {
    console.error('[planner/swap] error:', err.message);
    res.status(500).json({ error: err.message || 'Failed to swap slot' });
  }
});

// ─── POST /api/planner/chat ───────────────────────────────────────────────────
// Conversational AI about the trip plan — can answer questions, suggest changes,
// and return structured actions for the frontend to apply.
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { messages, plan } = req.body as {
      messages: { role: 'user' | 'assistant'; content: string }[];
      plan: {
        zone: string;
        days: DayPlan[];
        startHour: string;
        endHour: string;
        nightLife: boolean;
        budgetLevel: number;
      };
    };

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }
    if (!plan || !plan.days) {
      return res.status(400).json({ error: 'plan is required' });
    }

    const openai = getOpenAI();

    // ── Build full plan context ──────────────────────────────────────────────
    const planPoiIds = new Set(plan.days.flatMap((d) => d.slots.map((s) => s.poiId)));

    // Look up full POI details from the server-side POIS list
    const poiMap = new Map(POIS.map((p) => [p.id, p]));
    const detailLines = [...planPoiIds]
      .map((id) => {
        const p = poiMap.get(id);
        if (!p) return null;
        return `[${p.id}] ${p.name} (${p.category}, ${p.region})\n  Hours: ${p.hours ?? 'flexible'} | Price: ${p.price ?? 'free'} | Best time: ${p.bestTime ?? 'anytime'}\n  ${p.description}\n  Tips: ${p.tips ?? 'none'}`;
      })
      .filter(Boolean)
      .join('\n\n');

    // Plan context with actual day-of-week
    const planContext = plan.days
      .map((day) => {
        const dt = new Date(day.date + 'T12:00:00');
        const dow = dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const slots = day.slots
          .map((s) => `  ${s.startTime}–${s.endTime}: ${s.poiName}${s.notes ? ` (${s.notes})` : ''}${s.done ? ' ✓done' : ''}`)
          .join('\n');
        return `${dow}\n${slots || '  (no slots)'}`;
      })
      .join('\n\n');

    const today = new Date().toISOString().split('T')[0];
    const todayDow = new Date(today + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long' });

    const systemPrompt = `You are a knowledgeable and friendly Los Angeles travel companion. The user has an AI-generated trip plan and is chatting with you to ask questions, get clarifications, or request modifications.

TODAY: ${today} (${todayDow})

THE TRIP PLAN (${plan.zone}, budget level ${plan.budgetLevel}/4):
${planContext}

FULL DETAILS OF PLACES IN THE PLAN:
${detailLines}

YOUR CAPABILITIES:
1. Answer questions about the plan (day-of-week crowd levels, opening hours, free-entry days, seasonal tips)
2. Suggest improvements based on your LA expertise
3. Propose specific plan modifications using structured "actions"
4. Use web search to verify current hours, special events, and real-time info

KEY LA KNOWLEDGE YOU MUST APPLY:
- Getty Center: free entry every Thursday evening 5–9pm; quieter on weekday mornings than weekends
- LACMA: closed Wednesdays; Urban Light installation is spectacular at dusk/night
- Griffith Observatory: closed Mondays and Tuesdays; packed on weekend evenings; better midweek
- Venice Beach: more vibrant and lively on weekends; quieter/chill on weekdays
- The Broad: closed Mondays; free "FIRST Thursday" evenings 5–8pm
- Universal Studios: less crowded on weekdays, especially Tuesday–Thursday
- Hollywood Walk of Fame: fine any day but mornings before 10am avoid the worst heat and tour groups
- Santa Monica Pier: gorgeous at sunset any day; weekday sunsets much less crowded
- Runyon Canyon: best early morning (7–9am) to beat heat and find parking
- Farmers Markets: WeHo Sunday morning, Hollywood Sunday morning, DTLA Saturday morning

STRUCTURED ACTIONS (include in response when suggesting plan changes):
You can propose these action types. The user can apply them with one click.

"move_slot": Move a slot from one day to another
  - remove: { date, poiId }
  - add: { date, poiId, poiName, startTime, endTime, notes? }

"swap_slot": Replace a slot with a different POI (use exact poiId and poiName from the plan)
  - date, poiId, newPoiId, newPoiName, startTime?, endTime?, newNotes?

"reschedule_slot": Change the time of an existing slot (keep same POI, same day)
  - date, poiId, newStartTime, newEndTime, newNotes?

"add_note": Add/update a note on a slot
  - date, poiId, note

RESPONSE FORMAT — return ONLY valid JSON, no markdown fences:
{
  "message": "Your friendly, conversational response here. Be specific about WHY a day of week matters. Use web search for current info when helpful.",
  "actions": [
    {
      "type": "move_slot",
      "description": "Short label shown to user on the Apply button",
      "remove": { "date": "YYYY-MM-DD", "poiId": "exact-poi-id" },
      "add": { "date": "YYYY-MM-DD", "poiId": "exact-poi-id", "poiName": "Exact Name", "startTime": "HH:MM", "endTime": "HH:MM", "notes": "why this works" }
    }
  ]
}

IMPORTANT: Only include "actions" when proposing a concrete change. For questions and answers with no change, just return { "message": "..." } with no actions key.`;

    const input: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      ...messages,
    ];

    const response = await openai.responses.create({
      model: 'gpt-4o',
      tools: [{ type: 'web_search_preview' }],
      input,
    });

    const rawText = response.output_text;
    if (!rawText) throw new Error('Empty response from GPT-4o');

    const result = JSON.parse(extractJSON(rawText)) as { message: string; actions?: unknown[] };
    res.json(result);
  } catch (err: any) {
    console.error('[planner/chat] error:', err.message);
    res.status(500).json({ error: err.message || 'Chat failed' });
  }
});

export default router;
