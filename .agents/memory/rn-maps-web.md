---
name: react-native-maps web fix
description: How to prevent react-native-maps from breaking the web bundle in Expo
---

react-native-maps imports native-only modules (`react-native/Libraries/Utilities/codegenNativeCommands`) that cause Metro web bundler failures even when guarded by `Platform.OS === "web"` runtime checks (imports are evaluated at bundle time).

**Fix:** Use platform-specific file extensions:
- `components/DormMap.native.tsx` — imports MapView, Marker, Callout from react-native-maps
- `components/DormMap.tsx` — web fallback with no map imports (shows a friendly placeholder)
- The route file (`app/(tabs)/map.tsx`) imports `from "@/components/DormMap"` — Metro selects the right file automatically.

**Pin:** react-native-maps must be pinned to exactly 1.18.0. Do NOT add to app.json plugins. Do NOT upgrade.

**Why:** 1.18.0 is the last version compatible with our Expo SDK version without requiring a custom native build.

**How to apply:** Any new native-only component that needs web support should use this `.native.tsx` / `.tsx` splitting pattern.
