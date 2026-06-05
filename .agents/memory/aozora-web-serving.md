---
name: Aozora web serving
description: How the Aozora web UI is built and served in the Replit environment
---

## Setup
- `start.sh` (run by "Aozora Admin Website" workflow on port 5000) handles everything
- On first run, exports Expo web app: `node node_modules/expo/bin/cli export --platform web --output-dir dist`
- On subsequent restarts, skips the export if `artifacts/aozora/dist/index.html` already exists (fast startup)
- `dev-proxy.js` serves static files from `artifacts/aozora/dist/` for non-API routes, proxies `/api/*` to port 8080

## Why static export, not Metro dev server
- The user removed the Expo Dev Server workflow ("remove all about expo dev")
- Metro dev server is too slow and doesn't start within workflow health check window
- Static export is committed to disk and survives restarts

## Rebuild when needed
To force a fresh web build, delete `artifacts/aozora/dist/` and restart "Aozora Admin Website".

**Why:** Static export takes ~2 minutes (Metro bundling); skipping it on restarts keeps the app instantly available.

**How to apply:** Any time you change app code and need the web build updated, delete dist/ before restarting.
