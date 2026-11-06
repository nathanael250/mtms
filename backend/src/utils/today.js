import { env } from "../config/env.js";

// Today's date (YYYY-MM-DD) in the business timezone, not the server's or the browser's.
export function getTodayYmd() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: env.appTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
