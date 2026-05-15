#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_URL="${API_URL:-http://localhost:8000}"
FE_URL="${FE_URL:-http://localhost:3000}"

cd "$ROOT_DIR"

echo "[deploy-smoke] Starting stack"
docker compose up -d --build

echo "[deploy-smoke] Waiting for API health"
for attempt in {1..30}; do
  if curl -fsS "$API_URL/health" >/tmp/luminaprep-api-health.json; then
    echo "[deploy-smoke] API healthy"
    cat /tmp/luminaprep-api-health.json
    echo
    break
  fi

  if [ "$attempt" -eq 30 ]; then
    echo "[deploy-smoke] API health check failed after 30 attempts" >&2
    docker compose ps
    exit 1
  fi

  sleep 2
done

echo "[deploy-smoke] Checking frontend"
curl -fsSI "$FE_URL" >/tmp/luminaprep-fe-headers.txt
head -n 1 /tmp/luminaprep-fe-headers.txt

echo "[deploy-smoke] Checking BFF session endpoint"
curl -fsS "$FE_URL/auth/session" >/tmp/luminaprep-bff-session.json
cat /tmp/luminaprep-bff-session.json
echo

echo "[deploy-smoke] Container status"
docker compose ps

echo "[deploy-smoke] OK"
