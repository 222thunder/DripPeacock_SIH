# Deployment

## Prerequisites

- Python 3.9+ (AI service)
- Node.js 20+ (backend + frontend)
- MongoDB 6+ (optional at runtime; the backend degrades gracefully)
- Cloudinary account (optional — image uploads fall back to storing local file names)

## Environment Variables

### Backend (`backend/.env`)

```
PORT=5001
JWT_SECRET=change-me
MONGODB_URI=mongodb://localhost:27017/sih
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### AI Service (`ai-service/.env` / `.env.example`)

```
# Stub/provider endpoints used by ai-service; see ai-service/main.py
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:5001/api
```

## Local Run

```bash
./start_demo.sh
```

Starts:

| Service | Port |
| --- | --- |
| Next.js web UI | 3000 |
| Express API | 5001 |
| FastAPI / OCR | 8000 |

Then open http://localhost:3000.

Press Ctrl+C to stop all services (the script kills every launched PID).

## Running Services Individually

```bash
# AI service
cd ai-service && ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload

# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Tests & Checks

```bash
# Backend: unit tests (rule engine, review service, auth middleware, report service)
cd backend && npm test
# Backend type-check
cd backend && npx tsc --noEmit

# Frontend type-check + lint of changed files
cd frontend && npx tsc --noEmit && npx eslint src/app src/components
```

Note: `backend/tests/inspection.test.ts` requires a running MongoDB and is skipped locally when
no database is reachable.

## Production Notes

- Set a strong `JWT_SECRET` and rotate regularly.
- Use HTTPS/TLS in front of the API.
- Always provide `Authorization: Bearer <jwt>` for inspection endpoints; roles are enforced
  server-side (`ADMIN`, `SUPERVISOR`, `INSPECTOR`).
- Keep MongoDB reachable so compliance history, evidence metadata, and audit trails persist.
- Configure Cloudinary credentials so uploaded evidence is durable and retrievable by URL.
- The AI provider key/URL should be treated as a secret; never commit `.env` files.

## Logins

Seed users (create via `POST /api/auth/register` or the login page "Request Access"):

- INSPECTOR — scans, reviews OCR, verifies/rejects findings, generates reports.
- SUPERVISOR — additionally approves/finalizes reports.
- ADMIN — user/rule management and global reports.

The login response includes `token`, `role`, `email`, and `name`; the client stores the role for
UX gating but the backend always re-authorizes privileged actions.