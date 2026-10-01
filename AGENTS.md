# Base44 Dev Environment — Centre Zirara Connect

## Stack
Vite 8 + React 19 frontend served by an Express backend (`server.ts`, run via `tsx`) in a single process on port 3000. Single-origin wiring: the Express app mounts Vite in middleware mode (dev) and also exposes `/api/*` REST endpoints. Data layer is Postgres via Drizzle ORM (`src/db/`).

## Run
```
docker compose -f docker-compose.base44.yml up -d
```
- `db`: local `postgres:16-alpine` (user/db `zirara`, password `zirarapass`).
- `app`: `node:22-bookworm`, bind-mounts the repo, installs deps with `bun install --frozen-lockfile` (lockfile is `bun.lock`), pushes the Drizzle schema with `drizzle-kit push --config=src/db/drizzle.config.ts --force`, then runs `tsx server.ts`.
- App is healthy when `GET /` returns 200 and `/api/settings` returns JSON.

## Key quirks (non-obvious)
- **Drizzle config location**: the migration config is at `src/db/drizzle.config.ts`, NOT the repo root. `drizzle-kit` must be invoked with `--config=src/db/drizzle.config.ts`. That config reads `SQL_HOST` / `SQL_DB_NAME` / `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` (set in compose), while the app runtime reads `DATABASE_URL` (`src/db/index.ts`).
- **Package manager is bun** (`bun.lock`), but the server runs under node via `tsx` — not bun's runtime. `bun` is installed in the image via `npm install -g bun`.
- **HMR is disabled** (`DISABLE_HMR=true`) and Vite file-watching is off — this is the project's intended mode. After source edits, call `reload_preview` so the browser re-fetches freshly transformed modules.
- **Firebase config is committed** in `firebase-applet-config.json`; the frontend (`src/services/firebase.ts`) falls back to it when `VITE_FIREBASE_*` env vars are absent. No Firebase secrets are needed to boot/render. Auth uses Firebase Auth, but `AuthContext.login` falls back to a local session if Firebase is unreachable and the password matches.
- **Seeding is automatic**: `server.ts` seeds settings/users/filieres/classes/motifs into Postgres on boot if those tables are empty.

## Optional external credentials (NOT required to boot/render)
- `GEMINI_API_KEY` — server-side Gemini AI features (metadata declares `MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API`).
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` — the in-app "push to GitHub" feature.
- `SUPABASE_SECRET_KEY` — Supabase admin operations (the `ConnexionSupabase` component); the public anon key is in `.env.example`.
These are not wired into the compose because the app runs on local Postgres + committed Firebase config.

## Verify
```
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/   # 200
curl -s http://localhost:3000/api/users | head -c 120            # seeded users JSON
```
Login screen renders from local-storage mock data even before any API call succeeds.
