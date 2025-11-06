/**
 * Timeseries Versioning Semantics
 *
 * Defines version tag behavior and precedence rules for index data
 */

import type { VersionTag } from '@prisma/client';

// ============================================================================
// Version Tag Semantics
// ============================================================================

/**
 * Version Tag Types:
 *
 * - PRELIMINARY: Initial data release, subject to revision
 *   - Often published quickly for early decision-making
 *   - May be less accurate or incomplete
 *   - Example: Same-day oil price estimates
 *
 * - FINAL: Authoritative, confirmed data
 *   - Published after verification and quality checks
 *   - Preferred for official calculations
 *   - Example: Next-day confirmed oil prices
 *
 * - REVISED: Correction to previously published data
 *   - Used when errors are discovered or better data becomes available
 *   - Less common than prelim/final
 *   - Example: Retroactive price corrections
 */

/**
 * Extended version tag type supporting revision numbers
 *
 * Format: "prelim" | "final" | "rev1" | "rev2" | "rev3" | ...
 */
export type ExtendedVersionTag = VersionTag | `rev${number}`;

// ============================================================================
// Version Precedence
// ============================================================================

/**
 * Default version preference order
 *
 * For forward-looking queries (current/future):
 * 1. FINAL - Most authoritative
 * 2. REVISED - Corrections take precedence over originals
 * 3. PRELIMINARY - Fallback when final not available
 */
export const DEFAULT_VERSION_PRECEDENCE: VersionTag[] = [
  'FINAL',
  'REVISED',
  'PRELIMINARY',
];

/**
 * Gets version preference order based on requested version
 *
 * @param requestedVersion - The version to prioritize
 * @returns Ordered array of versions to try
 */
export function getVersionPreferenceOrder(
  requestedVersion?: VersionTag
): VersionTag[] {
  switch (requestedVersion) {
    case 'FINAL':
      return ['FINAL', 'REVISED', 'PRELIMINARY'];

    case 'REVISED':
      // When requesting revised, prefer revised but fall back to final
      return ['REVISED', 'FINAL', 'PRELIMINARY'];

    case 'PRELIMINARY':
      // When explicitly requesting preliminary, prefer it first
      return ['PRELIMINARY', 'FINAL', 'REVISED'];

    default:
      // Default: prefer final > revised > preliminary
      return DEFAULT_VERSION_PRECEDENCE;
  }
}

/**
 * Gets configurable version preference order
 *
 * Allows customization of precedence rules per tenant or use case
 *
 * @param policy - Preference policy
 * @returns Ordered array of versions
 */
export function getConfigurablePreference(policy: {
  /** Primary version to prefer */
  primary?: VersionTag;
  /** Secondary version to fall back to */
  secondary?: VersionTag;
  /** Tertiary version as last resort */
  tertiary?: VersionTag;
  /** Whether to exclude certain versions */
  exclude?: VersionTag[];
}): VersionTag[] {
  const order: VersionTag[] = [];

  // Add requested versions in order
  if (policy.primary) order.push(policy.primary);
  if (policy.secondary) order.push(policy.secondary);
  if (policy.tertiary) order.push(policy.tertiary);

  // Add remaining versions not yet included
  for (const version of DEFAULT_VERSION_PRECEDENCE) {
    if (!order.includes(version)) {
      order.push(version);
    }
  }

  // Apply exclusions
  if (policy.exclude) {
    return order.filter((v) => !policy.exclude!.includes(v));
  }

  return order;
}

// ============================================================================
// Historical "As-Of" Queries
// ============================================================================

/**
 * Determines which version would have been available at a historical date
 *
 * This enables "as-of" queries that reflect what data was known at a point in time.
 *
 * Example:
 * - Query date: 2024-01-15 (historical)
 * - Available versions for 2024-01-10:
 *   - PRELIMINARY published 2024-01-10
 *   - FINAL published 2024-01-12
 *   - REVISED published 2024-01-20 (after query date)
 *
 * Result: Only PRELIMINARY and FINAL would be visible in the as-of query.
 * REVISED wouldn't be visible because it was published after the query date.
 *
 * @param dataDate - The date the data is for
 * @param asOfDate - The historical date to query from
 * @param versionPublishDates - Map of version -> publish date
 * @returns Array of versions visible as of the query date
 */
export function getVersionsAvailableAsOf(
  dataDate: Date,
  asOfDate: Date,
  versionPublishDates: Map<VersionTag, Date>
): VersionTag[] {
  const availableVersions: VersionTag[] = [];

  for (const [version, publishDate] of versionPublishDates.entries()) {
    // Include version if it was published before or on the as-of date
    if (publishDate <= asOfDate) {
      availableVersions.push(version);
    }
  }

  return availableVersions;
}

/**
 * Filters version preference order to only include historically available versions
 *
 * @param preferenceOrder - Full preference order
 * @param availableVersions - Versions that were available historically
 * @returns Filtered preference order
 */
export function filterToAvailableVersions(
  preferenceOrder: VersionTag[],
  availableVersions: VersionTag[]
): VersionTag[] {
  return preferenceOrder.filter((v) => availableVersions.includes(v));
}

// ============================================================================
// Version Comparison
// ============================================================================

/**
 * Compares two versions to determine which is "better" according to preference
 *
 * @param v1 - First version
 * @param v2 - Second version
 * @param preferenceOrder - Version preference order
 * @returns -1 if v1 is better, 1 if v2 is better, 0 if equal
 */
export function compareVersions(
  v1: VersionTag,
  v2: VersionTag,
  preferenceOrder: VersionTag[] = DEFAULT_VERSION_PRECEDENCE
): -1 | 0 | 1 {
  const i1 = preferenceOrder.indexOf(v1);
  const i2 = preferenceOrder.indexOf(v2);

  if (i1 === -1 && i2 === -1) return 0;
  if (i1 === -1) return 1; // v2 is better (v1 not in preference list)
  if (i2 === -1) return -1; // v1 is better

  if (i1 < i2) return -1; // v1 is better (earlier in preference)
  if (i1 > i2) return 1; // v2 is better
  return 0; // Equal
}

/**
 * Selects the best version from multiple options
 *
 * @param versions - Available versions
 * @param preferenceOrder - Version preference order
 * @returns Best version according to preference
 */
export function selectBestVersion(
  versions: VersionTag[],
  preferenceOrder: VersionTag[] = DEFAULT_VERSION_PRECEDENCE
): VersionTag | null {
  if (versions.length === 0) return null;

  let best = versions[0];

  for (const version of versions) {
    if (compareVersions(version, best, preferenceOrder) === -1) {
      best = version;
    }
  }

  return best;
}

// ============================================================================
// Version Lifecycle
// ============================================================================

/**
 * Typical version lifecycle for index data
 */
export const VERSION_LIFECYCLE = {
  /**
   * PRELIMINARY → FINAL
   *
   * Most common flow: Preliminary data is published first,
   * then replaced by final data once confirmed.
   */
  standard: ['PRELIMINARY', 'FINAL'] as const,

  /**
   * PRELIMINARY → FINAL → REVISED
   *
   * Less common: Final data is later corrected.
   */
  withRevision: ['PRELIMINARY', 'FINAL', 'REVISED'] as const,

  /**
   * FINAL only
   *
   * Some data sources only publish final data.
   */
  finalOnly: ['FINAL'] as const,
};

/**
 * Checks if a version transition is valid
 *
 * @param from - Current version
 * @param to - New version
 * @returns True if transition is valid
 */
export function isValidVersionTransition(
  from: VersionTag,
  to: VersionTag
): boolean {
  // Same version -> invalid (no transition)
  if (from === to) return false;

  // PRELIMINARY → FINAL: valid
  if (from === 'PRELIMINARY' && to === 'FINAL') return true;

  // PRELIMINARY → REVISED: valid (skipping final)
  if (from === 'PRELIMINARY' && to === 'REVISED') return true;

  // FINAL → REVISED: valid (correction)
  if (from === 'FINAL' && to === 'REVISED') return true;

  // All other transitions are invalid
  return false;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Validates a version tag
 */
export function isValidVersionTag(tag: string): tag is VersionTag {
  return tag === 'PRELIMINARY' || tag === 'FINAL' || tag === 'REVISED';
}

/**
 * Parses an extended version tag (supporting rev1, rev2, etc.)
 */
export function parseExtendedVersionTag(
  tag: string
): { base: VersionTag; revision?: number } | null {
  if (isValidVersionTag(tag)) {
    return { base: tag };
  }

  const revMatch = tag.match(/^rev(\d+)$/);
  if (revMatch) {
    return {
      base: 'REVISED',
      revision: parseInt(revMatch[1], 10),
    };
  }

  return null;
}
