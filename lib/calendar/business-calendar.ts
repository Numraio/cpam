/**
 * Business Calendar Library
 *
 * Handles business day calculations, holiday calendars, and date rolling
 */

// ============================================================================
// Types
// ============================================================================

export type CalendarRegion = 'US' | 'EU' | 'AU' | 'UK' | 'CUSTOM';

export type RollConvention =
  | 'following' // Roll forward to next business day
  | 'preceding' // Roll backward to previous business day
  | 'modified_following' // Roll forward unless crosses month, then roll back
  | 'modified_preceding'; // Roll backward unless crosses month, then roll forward

export interface Holiday {
  date: Date;
  name: string;
  region?: CalendarRegion;
}

export interface BusinessCalendar {
  region: CalendarRegion;
  holidays: Set<string>; // ISO date strings (YYYY-MM-DD)
  weekendDays: number[]; // 0 = Sunday, 6 = Saturday
}

// ============================================================================
// Standard Holidays by Region
// ============================================================================

/**
 * US Federal Holidays (fixed dates only, for simplicity)
 */
const US_HOLIDAYS: Holiday[] = [
  { date: new Date('2024-01-01'), name: "New Year's Day", region: 'US' },
  { date: new Date('2024-07-04'), name: 'Independence Day', region: 'US' },
  { date: new Date('2024-11-28'), name: 'Thanksgiving', region: 'US' },
  { date: new Date('2024-12-25'), name: 'Christmas', region: 'US' },
  // 2025
  { date: new Date('2025-01-01'), name: "New Year's Day", region: 'US' },
  { date: new Date('2025-07-04'), name: 'Independence Day', region: 'US' },
  { date: new Date('2025-11-27'), name: 'Thanksgiving', region: 'US' },
  { date: new Date('2025-12-25'), name: 'Christmas', region: 'US' },
];

/**
 * EU Holidays (common across EU)
 */
const EU_HOLIDAYS: Holiday[] = [
  { date: new Date('2024-01-01'), name: "New Year's Day", region: 'EU' },
  { date: new Date('2024-05-01'), name: 'Labour Day', region: 'EU' },
  { date: new Date('2024-12-25'), name: 'Christmas', region: 'EU' },
  { date: new Date('2024-12-26'), name: 'Boxing Day', region: 'EU' },
  // 2025
  { date: new Date('2025-01-01'), name: "New Year's Day", region: 'EU' },
  { date: new Date('2025-05-01'), name: 'Labour Day', region: 'EU' },
  { date: new Date('2025-12-25'), name: 'Christmas', region: 'EU' },
  { date: new Date('2025-12-26'), name: 'Boxing Day', region: 'EU' },
];

/**
 * Australia Public Holidays
 */
const AU_HOLIDAYS: Holiday[] = [
  { date: new Date('2024-01-01'), name: "New Year's Day", region: 'AU' },
  { date: new Date('2024-01-26'), name: 'Australia Day', region: 'AU' },
  { date: new Date('2024-04-25'), name: 'ANZAC Day', region: 'AU' },
  { date: new Date('2024-12-25'), name: 'Christmas', region: 'AU' },
  { date: new Date('2024-12-26'), name: 'Boxing Day', region: 'AU' },
  // 2025
  { date: new Date('2025-01-01'), name: "New Year's Day", region: 'AU' },
  { date: new Date('2025-01-26'), name: 'Australia Day', region: 'AU' },
  { date: new Date('2025-04-25'), name: 'ANZAC Day', region: 'AU' },
  { date: new Date('2025-12-25'), name: 'Christmas', region: 'AU' },
  { date: new Date('2025-12-26'), name: 'Boxing Day', region: 'AU' },
];

/**
 * UK Bank Holidays
 */
const UK_HOLIDAYS: Holiday[] = [
  { date: new Date('2024-01-01'), name: "New Year's Day", region: 'UK' },
  { date: new Date('2024-05-06'), name: 'Early May Bank Holiday', region: 'UK' },
  { date: new Date('2024-08-26'), name: 'Summer Bank Holiday', region: 'UK' },
  { date: new Date('2024-12-25'), name: 'Christmas', region: 'UK' },
  { date: new Date('2024-12-26'), name: 'Boxing Day', region: 'UK' },
  // 2025
  { date: new Date('2025-01-01'), name: "New Year's Day", region: 'UK' },
  { date: new Date('2025-05-05'), name: 'Early May Bank Holiday', region: 'UK' },
  { date: new Date('2025-08-25'), name: 'Summer Bank Holiday', region: 'UK' },
  { date: new Date('2025-12-25'), name: 'Christmas', region: 'UK' },
  { date: new Date('2025-12-26'), name: 'Boxing Day', region: 'UK' },
];

// ============================================================================
// Calendar Creation
// ============================================================================

/**
 * Creates a business calendar for a region
 */
export function createCalendar(
  region: CalendarRegion,
  customHolidays?: Date[]
): BusinessCalendar {
  const holidays = new Set<string>();

  // Add regional holidays
  let regionalHolidays: Holiday[] = [];
  switch (region) {
    case 'US':
      regionalHolidays = US_HOLIDAYS;
      break;
    case 'EU':
      regionalHolidays = EU_HOLIDAYS;
      break;
    case 'AU':
      regionalHolidays = AU_HOLIDAYS;
      break;
    case 'UK':
      regionalHolidays = UK_HOLIDAYS;
      break;
    case 'CUSTOM':
      regionalHolidays = [];
      break;
  }

  for (const holiday of regionalHolidays) {
    holidays.add(toDateKey(holiday.date));
  }

  // Add custom holidays
  if (customHolidays) {
    for (const date of customHolidays) {
      holidays.add(toDateKey(date));
    }
  }

  // Standard weekend: Saturday and Sunday
  const weekendDays = [0, 6]; // Sunday, Saturday

  return {
    region,
    holidays,
    weekendDays,
  };
}

/**
 * Merges multiple calendars into one
 */
export function mergeCalendars(...calendars: BusinessCalendar[]): BusinessCalendar {
  const mergedHolidays = new Set<string>();
  const mergedWeekendDays = new Set<number>();

  for (const calendar of calendars) {
    for (const holiday of calendar.holidays) {
      mergedHolidays.add(holiday);
    }
    for (const day of calendar.weekendDays) {
      mergedWeekendDays.add(day);
    }
  }

  return {
    region: 'CUSTOM',
    holidays: mergedHolidays,
    weekendDays: Array.from(mergedWeekendDays),
  };
}

// ============================================================================
// Business Day Checks
// ============================================================================

/**
 * Checks if a date is a weekend
 */
export function isWeekend(date: Date, weekendDays: number[] = [0, 6]): boolean {
  return weekendDays.includes(date.getDay());
}

/**
 * Checks if a date is a holiday
 */
export function isHoliday(date: Date, calendar: BusinessCalendar): boolean {
  return calendar.holidays.has(toDateKey(date));
}

/**
 * Checks if a date is a business day
 */
export function isBusinessDay(date: Date, calendar: BusinessCalendar): boolean {
  return !isWeekend(date, calendar.weekendDays) && !isHoliday(date, calendar);
}

// ============================================================================
// Date Rolling
// ============================================================================

/**
 * Rolls a date forward to the next business day
 *
 * If the date is already a business day, returns it unchanged.
 */
export function rollForward(date: Date, calendar: BusinessCalendar): Date {
  const result = new Date(date);

  while (!isBusinessDay(result, calendar)) {
    result.setDate(result.getDate() + 1);
  }

  return result;
}

/**
 * Rolls a date backward to the previous business day
 *
 * If the date is already a business day, returns it unchanged.
 */
export function rollBackward(date: Date, calendar: BusinessCalendar): Date {
  const result = new Date(date);

  while (!isBusinessDay(result, calendar)) {
    result.setDate(result.getDate() - 1);
  }

  return result;
}

/**
 * Applies a roll convention to a date
 */
export function applyRollConvention(
  date: Date,
  calendar: BusinessCalendar,
  convention: RollConvention = 'following'
): Date {
  // If already a business day, return as-is
  if (isBusinessDay(date, calendar)) {
    return new Date(date);
  }

  switch (convention) {
    case 'following':
      return rollForward(date, calendar);

    case 'preceding':
      return rollBackward(date, calendar);

    case 'modified_following': {
      const forward = rollForward(date, calendar);
      // If rolled into next month, roll back instead
      if (forward.getMonth() !== date.getMonth()) {
        return rollBackward(date, calendar);
      }
      return forward;
    }

    case 'modified_preceding': {
      const backward = rollBackward(date, calendar);
      // If rolled into previous month, roll forward instead
      if (backward.getMonth() !== date.getMonth()) {
        return rollForward(date, calendar);
      }
      return backward;
    }
  }
}

// ============================================================================
// Business Day Arithmetic
// ============================================================================

/**
 * Adds business days to a date
 *
 * @param date - Starting date
 * @param days - Number of business days to add (can be negative)
 * @param calendar - Business calendar
 * @returns New date
 */
export function addBusinessDays(
  date: Date,
  days: number,
  calendar: BusinessCalendar
): Date {
  const result = new Date(date);
  const direction = days >= 0 ? 1 : -1;
  let remaining = Math.abs(days);

  while (remaining > 0) {
    result.setDate(result.getDate() + direction);

    if (isBusinessDay(result, calendar)) {
      remaining--;
    }
  }

  return result;
}

/**
 * Counts business days between two dates
 *
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @param calendar - Business calendar
 * @returns Number of business days
 */
export function countBusinessDays(
  startDate: Date,
  endDate: Date,
  calendar: BusinessCalendar
): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Ensure start <= end
  if (start > end) {
    return -countBusinessDays(end, start, calendar);
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    if (isBusinessDay(current, calendar)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Gets the first business day of the month
 */
export function firstBusinessDayOfMonth(
  year: number,
  month: number,
  calendar: BusinessCalendar
): Date {
  const firstDay = new Date(year, month, 1);
  return rollForward(firstDay, calendar);
}

/**
 * Gets the last business day of the month
 */
export function lastBusinessDayOfMonth(
  year: number,
  month: number,
  calendar: BusinessCalendar
): Date {
  const lastDay = new Date(year, month + 1, 0); // Day 0 of next month = last day of this month
  return rollBackward(lastDay, calendar);
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Converts a date to YYYY-MM-DD string key
 */
function toDateKey(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Parses YYYY-MM-DD string to Date
 */
export function parseDateKey(key: string): Date {
  return new Date(key);
}

/**
 * Checks if two dates are on the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return toDateKey(date1) === toDateKey(date2);
}
