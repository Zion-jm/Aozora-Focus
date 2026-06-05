---
name: Aozora artifact workflow setup
description: The 4 artifact-managed workflows in this project and their ports
---

## Workflow map

| Workflow | Port | What it does |
|---|---|---|
| `Aozora Admin Website` | 5000 (webview) | `bash start.sh` — static web proxy |
| `artifacts/api-server: API Server` | 8080 (console) | `fuser -k 8080 && pnpm run dev` — API |
| `artifacts/aozora: expo` | 20823 (console) | Metro dev server for Expo Go mobile |
| `artifacts/mockup-sandbox: Component Preview Server` | 8081 (console) | Vite dev server for canvas mockups |

## Critical rules
- **Never add a custom `API Server` workflow** — it conflicts with the artifact one on port 8080
- The Expo mobile artifact uses port 20823; the `dev` script in `artifacts/aozora/package.json` must use `--port 20823`
- The mockup-sandbox needs `pnpm --filter @workspace/mockup-sandbox install` on first setup (packages not auto-installed)

**Why:** The Replit artifact system automatically creates workflows from `artifact.toml` files. Adding duplicate workflows for the same port causes EADDRINUSE failures.
