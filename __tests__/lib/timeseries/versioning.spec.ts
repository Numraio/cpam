/**
 * Tests for Timeseries Versioning
 */

import type { VersionTag } from '@prisma/client';
import {
  getVersionPreferenceOrder,
  getConfigurablePreference,
  compareVersions,
  selectBestVersion,
  isValidVersionTransition,
  getVersionsAvailableAsOf,
  filterToAvailableVersions,
  DEFAULT_VERSION_PRECEDENCE,
} from '@/lib/timeseries/versioning';

describe('Version Preference Order', () => {
  it('defaults to FINAL > REVISED > PRELIMINARY', () => {
    const order = getVersionPreferenceOrder();
    expect(order).toEqual(['FINAL', 'REVISED', 'PRELIMINARY']);
  });

  it('prioritizes requested version first', () => {
    const prelim = getVersionPreferenceOrder('PRELIMINARY');
    expect(prelim[0]).toBe('PRELIMINARY');

    const final = getVersionPreferenceOrder('FINAL');
    expect(final[0]).toBe('FINAL');

    const revised = getVersionPreferenceOrder('REVISED');
    expect(revised[0]).toBe('REVISED');
  });

  it('allows configurable preference', () => {
    const custom = getConfigurablePreference({
      primary: 'REVISED',
      secondary: 'PRELIMINARY',
      tertiary: 'FINAL',
    });

    expect(custom).toEqual(['REVISED', 'PRELIMINARY', 'FINAL']);
  });

  it('supports version exclusion', () => {
    const noPrelim = getConfigurablePreference({
      exclude: ['PRELIMINARY'],
    });

    expect(noPrelim).not.toContain('PRELIMINARY');
    expect(noPrelim).toContain('FINAL');
    expect(noPrelim).toContain('REVISED');
  });
});

describe('Version Comparison', () => {
  it('ranks FINAL higher than REVISED', () => {
    const result = compareVersions('FINAL', 'REVISED', DEFAULT_VERSION_PRECEDENCE);
    expect(result).toBe(-1); // FINAL is better
  });

  it('ranks REVISED higher than PRELIMINARY', () => {
    const result = compareVersions('REVISED', 'PRELIMINARY', DEFAULT_VERSION_PRECEDENCE);
    expect(result).toBe(-1); // REVISED is better
  });

  it('ranks equal versions as equal', () => {
    const result = compareVersions('FINAL', 'FINAL', DEFAULT_VERSION_PRECEDENCE);
    expect(result).toBe(0);
  });

  it('selects best version from multiple options', () => {
    const versions: VersionTag[] = ['PRELIMINARY', 'REVISED', 'FINAL'];
    const best = selectBestVersion(versions);
    expect(best).toBe('FINAL');
  });

  it('selects best when FINAL not available', () => {
    const versions: VersionTag[] = ['PRELIMINARY', 'REVISED'];
    const best = selectBestVersion(versions);
    expect(best).toBe('REVISED');
  });
});

describe('Version Transitions', () => {
  it('allows PRELIMINARY → FINAL', () => {
    expect(isValidVersionTransition('PRELIMINARY', 'FINAL')).toBe(true);
  });

  it('allows FINAL → REVISED', () => {
    expect(isValidVersionTransition('FINAL', 'REVISED')).toBe(true);
  });

  it('allows PRELIMINARY → REVISED', () => {
    expect(isValidVersionTransition('PRELIMINARY', 'REVISED')).toBe(true);
  });

  it('disallows FINAL → PRELIMINARY', () => {
    expect(isValidVersionTransition('FINAL', 'PRELIMINARY')).toBe(false);
  });

  it('disallows REVISED → PRELIMINARY', () => {
    expect(isValidVersionTransition('REVISED', 'PRELIMINARY')).toBe(false);
  });

  it('disallows REVISED → FINAL', () => {
    expect(isValidVersionTransition('REVISED', 'FINAL')).toBe(false);
  });

  it('disallows same version transition', () => {
    expect(isValidVersionTransition('FINAL', 'FINAL')).toBe(false);
  });
});

describe('Historical As-Of Queries', () => {
  it('includes versions published before as-of date', () => {
    const dataDate = new Date('2024-01-10');
    const asOfDate = new Date('2024-01-15');

    const publishDates = new Map<VersionTag, Date>([
      ['PRELIMINARY', new Date('2024-01-10')],
      ['FINAL', new Date('2024-01-12')],
      ['REVISED', new Date('2024-01-20')],
    ]);

    const available = getVersionsAvailableAsOf(dataDate, asOfDate, publishDates);

    expect(available).toContain('PRELIMINARY');
    expect(available).toContain('FINAL');
    expect(available).not.toContain('REVISED'); // Published after as-of date
  });

  it('excludes versions published after as-of date', () => {
    const dataDate = new Date('2024-01-10');
    const asOfDate = new Date('2024-01-11');

    const publishDates = new Map<VersionTag, Date>([
      ['PRELIMINARY', new Date('2024-01-10')],
      ['FINAL', new Date('2024-01-12')],
    ]);

    const available = getVersionsAvailableAsOf(dataDate, asOfDate, publishDates);

    expect(available).toContain('PRELIMINARY');
    expect(available).not.toContain('FINAL'); // Published after as-of date
  });

  it('filters preference order to available versions', () => {
    const preferenceOrder: VersionTag[] = ['FINAL', 'REVISED', 'PRELIMINARY'];
    const availableVersions: VersionTag[] = ['PRELIMINARY', 'REVISED'];

    const filtered = filterToAvailableVersions(preferenceOrder, availableVersions);

    expect(filtered).toEqual(['REVISED', 'PRELIMINARY']);
    expect(filtered).not.toContain('FINAL');
  });
});

describe('Acceptance Tests', () => {
  it('Given prelim exists and later final arrives, then calcs on new batches use final by default', () => {
    // Scenario:
    // - 2024-01-10: PRELIMINARY published
    // - 2024-01-12: FINAL published
    // - Calculation runs on 2024-01-15

    const preferenceOrder = getVersionPreferenceOrder('FINAL');
    const availableVersions: VersionTag[] = ['PRELIMINARY', 'FINAL'];

    const best = selectBestVersion(availableVersions, preferenceOrder);

    expect(best).toBe('FINAL');
    expect(preferenceOrder[0]).toBe('FINAL');
  });

  it('Given historical as-of query, then returns values consistent with that dates knowledge', () => {
    // Scenario:
    // - Data date: 2024-01-10
    // - PRELIMINARY published: 2024-01-10
    // - FINAL published: 2024-01-12
    // - REVISED published: 2024-01-20
    // - Query as-of: 2024-01-15

    const dataDate = new Date('2024-01-10');
    const asOfDate = new Date('2024-01-15');

    const publishDates = new Map<VersionTag, Date>([
      ['PRELIMINARY', new Date('2024-01-10')],
      ['FINAL', new Date('2024-01-12')],
      ['REVISED', new Date('2024-01-20')],
    ]);

    // Get versions available as of query date
    const availableVersions = getVersionsAvailableAsOf(
      dataDate,
      asOfDate,
      publishDates
    );

    // Filter preference order to only available versions
    const preferenceOrder = getVersionPreferenceOrder('FINAL');
    const filtered = filterToAvailableVersions(preferenceOrder, availableVersions);

    // Select best available version
    const best = selectBestVersion(availableVersions, filtered);

    // Should use FINAL (was published by as-of date)
    expect(best).toBe('FINAL');

    // Should NOT use REVISED (wasn't published yet)
    expect(availableVersions).not.toContain('REVISED');
  });

  it('Given mixed versions in database, then query selects best according to precedence', () => {
    // Scenario: Database has all three versions for same date
    const allVersions: VersionTag[] = ['PRELIMINARY', 'FINAL', 'REVISED'];

    // Default preference: FINAL > REVISED > PRELIMINARY
    const best = selectBestVersion(allVersions);
    expect(best).toBe('FINAL');

    // If explicitly requesting revised
    const revisedPreference = getVersionPreferenceOrder('REVISED');
    const bestRevised = selectBestVersion(allVersions, revisedPreference);
    expect(bestRevised).toBe('REVISED');

    // If FINAL not available
    const noFinal: VersionTag[] = ['PRELIMINARY', 'REVISED'];
    const bestNoFinal = selectBestVersion(noFinal);
    expect(bestNoFinal).toBe('REVISED');
  });
});
