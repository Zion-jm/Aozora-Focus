---
name: Admin routing architecture
description: How admin users are routed to a dedicated admin section vs regular tabs
---

## Rule
Admin users log in and are redirected to `/admin` (not `/(tabs)`). They have a completely separate
Tabs layout (`app/admin/_layout.tsx`) with 5 dark-indigo tabs: Dashboard, Listings, Verify, Users, Reports.

## Key files
- `app/admin/_layout.tsx` — Tabs layout, dark tab bar (`#1a1740`), tabBarBadge for pending counts
- `app/(auth)/login.tsx` — `data.user.role === "admin"` → `router.replace("/admin")`, else `/(tabs)`
- `app/index.tsx` — `user?.role === "admin"` → `<Redirect href="/admin" />`, else `/(tabs)`
- `app/_layout.tsx` — root Stack uses `<Stack.Screen name="admin" />` (group), NOT individual `admin/index`, `admin/users` etc.
- `app/(tabs)/_layout.tsx` — admin tab always hidden via `href: null`; appointments hidden for admin via `href: isAdmin ? null : undefined`

**Why:** Admins need a visually distinct dark-themed navigation separate from the student/owner experience.

**How to apply:** If adding new admin screens (e.g., `admin/analytics.tsx`), add a `<Tabs.Screen name="analytics" />` to `app/admin/_layout.tsx`. Hidden secondary screens use `options={{ href: null }}`.

## Design tokens
- Primary color: `#4f46e5` (indigo-600), replaces old `#0ea5e9` (sky blue)
- Admin tab bar bg: `#1a1740` (deep navy)
- Admin tab active tint: `#a5b4fc` (light indigo)
- Login: deep indigo gradient background `['#0f0e1a', '#1e1b4b', '#3730a3']`, frosted white card
