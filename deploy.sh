#!/usr/bin/env bash
# deploy.sh — rebuild and restart backend services on the local Docker Compose stack
set -euo pipefail

COMPOSE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKIP_BUILD=${SKIP_BUILD:-0}

echo "▶ travel-guide deploy"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

cd "$COMPOSE_DIR"

# ─── Build + restart ─────────────────────────────────────────────────────────
if [[ "$SKIP_BUILD" != "1" ]]; then
  echo "[1/2] Building backend image..."
  docker compose build backend
  echo "      ✓ build complete"
else
  echo "[1/2] Skipping build (SKIP_BUILD=1)"
fi

echo "[2/2] Restarting services..."
docker compose up -d --force-recreate backend cloudflared
echo "      ✓ services restarted"

# ─── Health check ────────────────────────────────────────────────────────────
sleep 5
STATUS=$(curl -sf http://localhost:3002/api/health 2>/dev/null \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null \
  || echo "unreachable")

if [[ "$STATUS" == "healthy" ]]; then
  echo "      ✓ /api/health → healthy"
else
  echo "      ✗ health check failed: $STATUS"
  echo "      Run: docker compose logs backend --tail=50"
  exit 1
fi

# ─── Show tunnel URL ─────────────────────────────────────────────────────────
TUNNEL=$(docker compose logs cloudflared 2>/dev/null \
  | grep -o "https://[^ ]*\.trycloudflare\.com" | tail -1 \
  || echo "(check: docker compose logs cloudflared)")

echo ""
echo "✅  Deploy complete!"
echo "   Local:  http://localhost:3002/api/health"
echo "   Tunnel: $TUNNEL"
echo ""
