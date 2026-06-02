/**
 * Normalize a timestamp string from the API (SQLite UTC, no timezone marker)
 * to a proper Date object so JS doesn't misinterpret it as local time.
 */
export function parseApiDate(ts: string): Date {
  if (!ts) return new Date();
  if (ts.includes("Z") || ts.includes("+") || (ts.includes("T") && ts.length > 19)) {
    return new Date(ts);
  }
  return new Date(ts.replace(" ", "T") + "Z");
}

/**
 * Human-readable relative time (e.g. "just now", "3m ago", "2h ago", "5d ago").
 * Short format omits "ago" — used in message list timestamps.
 */
export function timeAgo(ts: string, short = false): string {
  const date = parseApiDate(ts);
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);

  if (diff < 60) return short ? "now" : "just now";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return short ? `${m}m` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return short ? `${h}h` : `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  if (d === 1 && !short) return "Yesterday";
  if (d < 7) return short ? `${d}d` : `${d}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}
