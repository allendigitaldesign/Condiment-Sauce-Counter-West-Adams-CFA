/**
 * Days, always in the store's own time zone.
 *
 * Never use `Date.toISOString()` for a day: it converts to UTC, and from 5pm
 * (or 4pm in winter) Los Angeles time UTC is already tomorrow — every tap
 * through dinner would be counted against the wrong day. Days are plain
 * "YYYY-MM-DD" strings everywhere, made here.
 */

export const STORE_TIME_ZONE = 'America/Los_Angeles';

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Today at the store, as "YYYY-MM-DD". */
export function storeToday(now = new Date()): string {
  return dayFormat.format(now);
}

/** "2026-10-21" → "Wednesday, Oct 21". */
export function dayLabel(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  // Noon UTC is the same calendar day everywhere in the Americas.
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}
