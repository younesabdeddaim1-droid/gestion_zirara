# Base44 Development Environment

## Overview
Full-stack React + Vite + Express app for Centre Zirara school management.
Uses Drizzle ORM with PostgreSQL, Firebase client config, and Supabase client config.

## Setup
- **Package manager**: Bun (bun.lock present; npm fails on peer dep conflicts — use bun)
- **Dev command**: `bunx tsx server.ts` (Express + Vite middleware mode, live reload)
- **Database**: Local PostgreSQL in Docker (migrated via `bunx drizzle-kit push`)
- **Port**: 3000

## Architecture
- `server.ts` — Express server with API endpoints + Vite dev middleware in dev mode
- `src/db/schema.ts` — Drizzle ORM schema (11 tables)
- `src/db/index.ts` — PostgreSQL connection pool (uses DATABASE_URL)
- `src/db/drizzle.config.ts` — Drizzle Kit config (requires SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER, SQL_ADMIN_PASSWORD)
- Frontend is a Vite SPA with PWA support

## Key Details
- The app auto-seeds the database on startup if tables are empty (settings, users, filieres, classes, motifs)
- `DISABLE_HMR=true` disables Vite HMR to prevent flickering during agent edits
- Firebase and Supabase public config values are in `.env.base44-defaults` (not secrets — they're client-side)
- No external secrets required to boot; the app runs fully with local PostgreSQL

## Verify
- `curl http://localhost:3000/` — should return HTML with Vite client
- `curl http://localhost:3000/api/settings` — should return JSON with centre settings
