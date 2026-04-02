import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import { POIS } from './data/pois';
import plannerRouter from './routes/planner';
import profilesRouter from './routes/profiles';

// Ensure data directory exists on startup
const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsOrigins: string[] = process.env.CORS_ORIGINS
  ? (JSON.parse(process.env.CORS_ORIGINS) as string[])
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOriginRegex: RegExp = new RegExp(
  process.env.CORS_ORIGIN_REGEX ||
    String.raw`(http://localhost(:\d+)?)|(https://[\w-]+\.trycloudflare\.com)|(https://[\w-]+\.pages\.dev)`
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin requests (no Origin header) and any matching origin
      if (!origin || corsOrigins.includes(origin) || corsOriginRegex.test(origin)) {
        return callback(null, true);
      }
      callback(new Error(`CORS blocked: ${origin}`));
    },
    credentials: true,
  })
);
// ──────────────────────────────────────────────────────────────────────────────

app.use(express.json());

// Get all POIs
app.get('/api/pois', (_req, res) => {
  res.json(POIS);
});

// Get POIs by region
app.get('/api/pois/region/:region', (req, res) => {
  const { region } = req.params;
  const filtered = POIS.filter(p => p.region.toLowerCase() === region.toLowerCase());
  res.json(filtered);
});

// Get POIs by tier
app.get('/api/pois/tier/:tier', (req, res) => {
  const tier = parseInt(req.params.tier);
  const filtered = POIS.filter(p => p.tier === tier);
  res.json(filtered);
});

// Get POIs by category
app.get('/api/pois/category/:category', (req, res) => {
  const { category } = req.params;
  const filtered = POIS.filter(p => p.category === category);
  res.json(filtered);
});

// AI Trip Planner
app.use('/api/planner', plannerRouter);

// User profiles + saved plans
app.use('/api/profiles', profilesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'healthy', pois: POIS.length });
});

app.listen(PORT, () => {
  console.log(`\n🌊 Highway 1 Travel Guide API running on http://localhost:${PORT}`);
  console.log(`📍 ${POIS.length} POIs loaded\n`);
});
