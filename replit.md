# Aozora

A mobile-first dorm finder and visitation appointment platform for students in Lopez, Quezon, Philippines. Tagline: "Home, but smarter."

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, proxied at /api)
- `pnpm --filter @workspace/aozora run dev` — run the Expo app (web preview + Expo Go QR)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Mobile: Expo 54 (React Native), Expo Router 6, react-native-maps 1.18.0 (pinned)
- API: Express 5, better-sqlite3, bcryptjs, jsonwebtoken
- DB: SQLite (stored at `cwd()/aozora.db`, configurable via `DB_PATH` env)
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec at `lib/api-spec/openapi.yaml`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod schemas
- `artifacts/api-server/src/db/schema.ts` — SQLite schema
- `artifacts/api-server/src/db/seed.ts` — seed data
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/aozora/app/` — Expo Router screens
- `artifacts/aozora/context/AuthContext.tsx` — auth state + token management
- `artifacts/aozora/components/DormMap.tsx` — web fallback map
- `artifacts/aozora/components/DormMap.native.tsx` — native react-native-maps map

## Architecture decisions

- SQLite via better-sqlite3 directly in api-server (NOT via lib/db which uses PostgreSQL/Drizzle)
- JWT auth with `JWT_SECRET` env (defaults to dev key)
- react-native-maps pinned to 1.18.0 — do NOT upgrade or add to app.json plugins
- Platform-specific files (`DormMap.native.tsx` / `DormMap.tsx`) handle the react-native-maps web incompatibility
- `lib/api-zod/src/index.ts` exports only from `./generated/api` (not types) to avoid TS2308 duplicate export errors
- favorites/check/:dormId route defined BEFORE favorites/:dormId in Express to avoid route collision

## Product

Three roles: **Student** (browse dorms, favorites, appointments, messages), **Owner** (manage listings, respond to appointments), **Admin** (approve dorms, review ID verifications, manage users).

Screens: Explore, Map, Visits, Messages, Profile tabs + Dorm detail, Create listing, Appointment detail, Chat, Favorites, My Listings, ID Verification, Admin panel (dashboard, users, dorms, verifications).

## Seed Accounts

- Admin: `admin@aozora.ph` / `admin123`
- Owner: `maria@example.com` / `owner123`
- Student: `ana@example.com` / `student123`

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- react-native-maps must be pinned to exactly 1.18.0; do NOT add to app.json plugins
- babel-preset-expo must be ~54.0.10 (not 56.x)
- Do not run `pnpm dev` at workspace root — use workflows
- DB stored at `cwd()/aozora.db` (relative to api-server process)
- JWT_SECRET defaults to "aozora-secret-key-change-in-production" — set a real secret before deploying
- `setBaseUrl` must be called outside any component in `_layout.tsx`

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
- See the `expo` skill for Expo/React Native conventions
