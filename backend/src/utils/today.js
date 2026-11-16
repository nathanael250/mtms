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

// Saturday and Sunday are not working days.
export function isWeekendYmd(ymd) {
  const day = new Date(`${ymd}T00:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

// The next working day after a date: Friday, Saturday and Sunday all give Monday.
export function nextWorkingDayYmd(ymd) {
  const next = new Date(`${ymd}T00:00:00Z`);
  do {
    next.setUTCDate(next.getUTCDate() + 1);
  } while (next.getUTCDay() === 0 || next.getUTCDay() === 6);
  return next.toISOString().slice(0, 10);
}
