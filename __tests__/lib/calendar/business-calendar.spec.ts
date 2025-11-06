/**
 * Tests for Business Calendar
 */

import {
  createCalendar,
  isBusinessDay,
  isWeekend,
  isHoliday,
  rollForward,
  rollBackward,
  applyRollConvention,
  addBusinessDays,
  countBusinessDays,
  firstBusinessDayOfMonth,
  lastBusinessDayOfMonth,
} from '@/lib/calendar/business-calendar';

describe('Business Day Checks', () => {
  it('identifies weekends', () => {
    const saturday = new Date('2024-01-06'); // Saturday
    const sunday = new Date('2024-01-07'); // Sunday
    const monday = new Date('2024-01-08'); // Monday

    expect(isWeekend(saturday)).toBe(true);
    expect(isWeekend(sunday)).toBe(true);
    expect(isWeekend(monday)).toBe(false);
  });

  it('identifies US holidays', () => {
    const calendar = createCalendar('US');

    const newYears = new Date('2024-01-01');
    const july4 = new Date('2024-07-04');
    const christmas = new Date('2024-12-25');
    const regularDay = new Date('2024-03-15');

    expect(isHoliday(newYears, calendar)).toBe(true);
    expect(isHoliday(july4, calendar)).toBe(true);
    expect(isHoliday(christmas, calendar)).toBe(true);
    expect(isHoliday(regularDay, calendar)).toBe(false);
  });

  it('identifies business days', () => {
    const calendar = createCalendar('US');

    const weekday = new Date('2024-03-15'); // Friday, no holiday
    const weekend = new Date('2024-03-16'); // Saturday
    const holiday = new Date('2024-01-01'); // New Year's Day

    expect(isBusinessDay(weekday, calendar)).toBe(true);
    expect(isBusinessDay(weekend, calendar)).toBe(false);
    expect(isBusinessDay(holiday, calendar)).toBe(false);
  });
});

describe('Date Rolling', () => {
  const calendar = createCalendar('US');

  it('rolls forward from holiday to next business day', () => {
    // Jan 1, 2024 is Monday (New Year's Day holiday)
    const newYears = new Date('2024-01-01');
    const rolled = rollForward(newYears, calendar);

    // Should roll to Jan 2 (Tuesday)
    expect(rolled.getDate()).toBe(2);
    expect(rolled.getMonth()).toBe(0); // January
    expect(isBusinessDay(rolled, calendar)).toBe(true);
  });

  it('rolls forward from weekend to next business day', () => {
    // Jan 6, 2024 is Saturday
    const saturday = new Date('2024-01-06');
    const rolled = rollForward(saturday, calendar);

    // Should roll to Jan 8 (Monday)
    expect(rolled.getDate()).toBe(8);
    expect(rolled.getDay()).toBe(1); // Monday
  });

  it('returns same date if already business day', () => {
    const businessDay = new Date('2024-03-15'); // Friday
    const rolled = rollForward(businessDay, calendar);

    expect(rolled.getDate()).toBe(15);
    expect(rolled.getMonth()).toBe(2); // March
  });

  it('rolls backward from weekend to previous business day', () => {
    // Jan 7, 2024 is Sunday
    const sunday = new Date('2024-01-07');
    const rolled = rollBackward(sunday, calendar);

    // Should roll to Jan 5 (Friday)
    expect(rolled.getDate()).toBe(5);
    expect(rolled.getDay()).toBe(5); // Friday
  });

  it('applies modified following convention', () => {
    // Dec 31, 2023 is Sunday (rolls to Jan 1, 2024 which is holiday)
    // Modified following should roll back to Dec 29 (Friday) to stay in same month
    const calendar2023 = createCalendar('US');
    const lastDay2023 = new Date('2023-12-31');

    const rolled = applyRollConvention(lastDay2023, calendar2023, 'modified_following');

    // Should roll back to Dec 29 (Friday) to stay in December
    expect(rolled.getDate()).toBe(29);
    expect(rolled.getMonth()).toBe(11); // December
  });
});

describe('Business Day Arithmetic', () => {
  const calendar = createCalendar('US');

  it('adds business days', () => {
    // Start on Friday, Jan 5, 2024
    const start = new Date('2024-01-05');

    // Add 3 business days: Mon 8, Tue 9, Wed 10
    const result = addBusinessDays(start, 3, calendar);

    expect(result.getDate()).toBe(10);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDay()).toBe(3); // Wednesday
  });

  it('subtracts business days', () => {
    // Start on Wednesday, Jan 10, 2024
    const start = new Date('2024-01-10');

    // Subtract 3 business days: Tue 9, Mon 8, Fri 5
    const result = addBusinessDays(start, -3, calendar);

    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getDay()).toBe(5); // Friday
  });

  it('counts business days between dates', () => {
    // Jan 5 (Fri) to Jan 12 (Fri) 2024
    // Business days: 5, 8, 9, 10, 11, 12 = 6 days
    const start = new Date('2024-01-05');
    const end = new Date('2024-01-12');

    const count = countBusinessDays(start, end, calendar);

    expect(count).toBe(6);
  });

  it('gets first business day of month', () => {
    // January 2024: 1st is Monday (holiday), so first business day is Jan 2
    const first = firstBusinessDayOfMonth(2024, 0, calendar); // Month 0 = January

    expect(first.getDate()).toBe(2);
    expect(first.getMonth()).toBe(0);
  });

  it('gets last business day of month', () => {
    // March 2024: 31st is Sunday, so last business day is March 29 (Friday)
    const last = lastBusinessDayOfMonth(2024, 2, calendar); // Month 2 = March

    expect(last.getDate()).toBe(29);
    expect(last.getMonth()).toBe(2);
    expect(last.getDay()).toBe(5); // Friday
  });
});

describe('Regional Calendars', () => {
  it('creates US calendar', () => {
    const calendar = createCalendar('US');
    expect(isHoliday(new Date('2024-07-04'), calendar)).toBe(true); // Independence Day
  });

  it('creates EU calendar', () => {
    const calendar = createCalendar('EU');
    expect(isHoliday(new Date('2024-05-01'), calendar)).toBe(true); // Labour Day
  });

  it('creates AU calendar', () => {
    const calendar = createCalendar('AU');
    expect(isHoliday(new Date('2024-01-26'), calendar)).toBe(true); // Australia Day
  });

  it('creates UK calendar', () => {
    const calendar = createCalendar('UK');
    expect(isHoliday(new Date('2024-08-26'), calendar)).toBe(true); // Summer Bank Holiday
  });

  it('creates custom calendar', () => {
    const customHolidays = [
      new Date('2024-03-15'),
      new Date('2024-06-21'),
    ];

    const calendar = createCalendar('CUSTOM', customHolidays);

    expect(isHoliday(new Date('2024-03-15'), calendar)).toBe(true);
    expect(isHoliday(new Date('2024-06-21'), calendar)).toBe(true);
    expect(isHoliday(new Date('2024-07-04'), calendar)).toBe(false); // Not a US holiday
  });
});

describe('Acceptance Tests', () => {
  it('Given Jan 1 holiday, then effective date rolls to Jan 2 (if business day)', () => {
    const calendar = createCalendar('US');

    // Jan 1, 2024 is Monday (New Year's Day holiday)
    const jan1 = new Date('2024-01-01');

    // Roll forward to next business day
    const effective = rollForward(jan1, calendar);

    // Should be Jan 2 (Tuesday)
    expect(effective.getDate()).toBe(2);
    expect(effective.getMonth()).toBe(0); // January
    expect(isBusinessDay(effective, calendar)).toBe(true);
  });

  it('Given custom contract calendar, then rules follow custom list', () => {
    // Create custom calendar with specific holidays
    const customHolidays = [
      new Date('2024-03-15'), // Custom holiday
      new Date('2024-06-21'), // Custom holiday
    ];

    const calendar = createCalendar('CUSTOM', customHolidays);

    // March 15 should be a holiday
    const mar15 = new Date('2024-03-15');
    expect(isHoliday(mar15, calendar)).toBe(true);
    expect(isBusinessDay(mar15, calendar)).toBe(false);

    // Roll forward from March 15 (Friday, holiday)
    const rolled = rollForward(mar15, calendar);

    // Should roll to March 18 (Monday)
    expect(rolled.getDate()).toBe(18);
    expect(rolled.getDay()).toBe(1); // Monday
    expect(isBusinessDay(rolled, calendar)).toBe(true);
  });

  it('Given weekend followed by holiday, then rolls forward multiple days', () => {
    // Create calendar where Jan 1 is holiday
    const calendar = createCalendar('US');

    // Dec 30, 2023 is Saturday
    const dec30 = new Date('2023-12-30');

    // Roll forward: Dec 30 (Sat) → Dec 31 (Sun) → Jan 1 (Mon, holiday) → Jan 2 (Tue)
    const rolled = rollForward(dec30, calendar);

    expect(rolled.getDate()).toBe(2);
    expect(rolled.getMonth()).toBe(0); // January
    expect(rolled.getFullYear()).toBe(2024);
  });
});
