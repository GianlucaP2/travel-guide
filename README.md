# 🛣️ Highway 1 Road Trip Guide

An interactive web app for following the ultimate California road trip — **San Francisco to Los Angeles along Highway 1 (PCH)**, with GPS tracking, 70+ ranked stops, and a beautiful dark-themed map.

## Features

- 🗺️ **Full interactive map** with CartoDB dark tiles
- 📍 **70+ curated stops** ranked by importance (Tier 1–4)
- 🔵 **Live GPS tracking** with auto-follow mode
- 🎯 **Filter by** category, tier, region, or search
- 📱 **Fully responsive** — desktop sidebar + mobile bottom sheet
- 🛣️ **Route polyline** showing the full Highway 1 path
- 🔗 **Google Maps directions** from any stop

## Stop Tiers

| Tier | Label | Color | Examples |
|------|-------|-------|---------|
| ★★★★ | Must-See | 🔴 Red | Bixby Bridge, McWay Falls, El Matador Beach |
| ★★★  | Recommended | 🟠 Orange | Pigeon Point, Esalen, Moonstone Beach |
| ★★   | Worth a visit | 🔵 Blue | Pacific Grove, Cayucos, Gaviota |
| ★    | If passing by | ⚫ Gray | Local gems, scenic overlooks |

## Quick Start

### Frontend only (recommended)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) 🎉

### With backend API

```bash
# Terminal 1 — Backend
cd backend
npm install
npm run dev

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

## Tech Stack

- **Frontend:** React 18 + Vite + TypeScript + Tailwind CSS + Leaflet / react-leaflet
- **Backend:** Express + TypeScript (optional — data is embedded in frontend)
- **Map tiles:** CartoDB Dark Matter (free, no API key needed)
- **GPS:** Browser Geolocation API

## Route Coverage

San Francisco → Pacifica → Half Moon Bay → Santa Cruz → Monterey → Pacific Grove → Carmel → **Big Sur** → San Simeon → Cambria → Cayucos → Morro Bay → San Luis Obispo → Pismo Beach → Santa Barbara → Ventura → **Malibu** → Santa Monica → Los Angeles

**~420 miles · 70+ stops · ∞ memories** 🌊
