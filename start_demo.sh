#!/usr/bin/env bash
# SIH 2026 - Legal Metrology Packaged Commodity Compliance System
# Starts the AI Service (FastAPI), Backend (Express), and Frontend (Next.js).
set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

PORT_AI=8000
PORT_API=5001
PORT_WEB=3000

command_exists() { command -v "$1" >/dev/null 2>&1; }

pids=()
cleanup() {
  echo ""
  echo "Stopping services..."
  for pid in "${pids[@]}"; do
    kill "$pid" >/dev/null 2>&1 || true
  done
  exit 0
}
trap cleanup INT TERM

echo "==> Checking prerequisites"
for cmd in node npm python3; do
  if ! command_exists "$cmd"; then
    echo "ERROR: '$cmd' is not installed. Please install it first." >&2
    exit 1
  fi
done

# 1) AI Service (FastAPI + OCR)
echo "==> Starting AI Service on :${PORT_AI}"
if [ -x "$ROOT/ai-service/venv/bin/uvicorn" ]; then
  UVI="$(dirname "$ROOT/ai-service/venv/bin/uvicorn")"
  (cd "$ROOT/ai-service" && PYTHONPATH="$PWD" "$UVI/uvicorn" main:app --host 0.0.0.0 --port $PORT_AI --reload) &
  pids+=($!)
elif command_exists uvicorn; then
  (cd "$ROOT/ai-service" && uvicorn main:app --host 0.0.0.0 --port $PORT_AI --reload) &
  pids+=($!)
else
  echo "WARN: uvicorn not found; AI service will not start. OCR endpoints may fail." >&2
fi

# 2) Backend (Express + MongoDB optional)
echo "==> Starting Backend on :${PORT_API}"
(cd "$ROOT/backend" && npm run dev) &
pids+=($!)

# 3) Frontend (Next.js)
echo "==> Starting Frontend on :${PORT_WEB}"
(cd "$ROOT/frontend" && npm run dev) &
pids+=($!)

echo ""
echo "All services launching..."
echo "  Web UI    -> http://localhost:${PORT_WEB}"
echo "  API       -> http://localhost:${PORT_API}/health"
echo "  AI/OCR    -> http://localhost:${PORT_AI}/docs"
echo "Press Ctrl+C to stop all services."
echo ""

wait