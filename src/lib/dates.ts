import {
  startOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  parseISO,
  isValid,
} from 'date-fns';

/** Return the Monday of the week containing `date`. */
export function getWeekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}

/** Return the 5 weekday Date objects (Mon–Fri) for the given week start. */
export function getWeekDates(weekStart: Date): Date[] {
  return Array.from({ length: 5 }, (_, i) => addDays(weekStart, i));
}

/** Format a Date as 'YYYY-MM-DD' for database queries. */
export function toDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse the `?week=` query param into a valid Monday Date.
 * Falls back to the current week's Monday if param is absent or invalid.
 */
export function parseWeekParam(param: string | null): Date {
  if (param) {
    const d = parseISO(param);
    if (isValid(d)) return getWeekStart(d);
  }
  return getWeekStart(new Date());
}

/** Advance one week. */
export function nextWeek(weekStart: Date): Date {
  return addWeeks(weekStart, 1);
}

/** Go back one week. */
export function prevWeek(weekStart: Date): Date {
  return subWeeks(weekStart, 1);
}

/** e.g. "Mon, Apr 8" */
export function formatDayHeader(date: Date): string {
  return format(date, 'EEE, MMM d');
}

/** e.g. "April 2024" or "March – April 2024" */
export function formatMonthRange(weekStart: Date): string {
  const weekEnd = addDays(weekStart, 4);
  const s = format(weekStart, 'MMMM');
  const e = format(weekEnd, 'MMMM');
  const y = format(weekEnd, 'yyyy');
  return s === e ? `${s} ${y}` : `${s} – ${e} ${y}`;
}
