---
name: Expo babel-preset version
description: Which babel-preset-expo version is compatible with Expo 54 in this project
---

babel-preset-expo must be pinned to `~54.0.10` for Expo 54.

Installing 56.x (the latest) causes `Cannot find module 'babel-preset-expo'` errors in Metro because the version resolution breaks.

**Why:** Expo's Metro config resolves the preset by version compatibility; a major mismatch causes silent resolution failures at bundle time.

**How to apply:** When running `pnpm add babel-preset-expo`, always pin to `~54.0.10`. If version warnings appear, check against the installed Expo SDK version first.
