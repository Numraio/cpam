import { Shimmer } from './Shimmer';

interface SkeletonCardProps {
  /** Number of cards to display (default: 1) */
  count?: number;
  /** Card height (default: auto) */
  height?: number;
  /** Show card header (default: true) */
  showHeader?: boolean;
  /** Show card footer (default: false) */
  showFooter?: boolean;
}

/**
 * Skeleton Card Component
 *
 * Loading state for card components matching the Card/KPICard layout.
 * Displays animated skeleton content while data is being fetched.
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <SkeletonCard count={3} showHeader />
 * ) : (
 *   kpiData.map(kpi => <KPICard {...kpi} />)
 * )}
 * ```
 */
export function SkeletonCard({
  count = 1,
  height,
  showHeader = true,
  showFooter = false,
}: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
          style={height ? { height: `${height}px` } : undefined}
        >
          {showHeader && (
            <div className="mb-4">
              <div className="relative h-4 w-1/3 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
                <Shimmer />
              </div>
              <div className="relative h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <Shimmer />
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="relative h-8 w-2/3 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <Shimmer />
            </div>
            <div className="relative h-4 w-full bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <Shimmer />
            </div>
            <div className="relative h-4 w-4/5 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
              <Shimmer />
            </div>
          </div>

          {showFooter && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="relative h-4 w-1/4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <Shimmer />
              </div>
            </div>
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Skeleton KPI Card Component
 *
 * Specialized loading state for KPI metric cards with icon and value placeholders.
 */
export function SkeletonKPICard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 animate-pulse"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="relative h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-3">
                <Shimmer />
              </div>
              <div className="relative h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
                <Shimmer />
              </div>
              <div className="relative h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <Shimmer />
              </div>
            </div>
            <div className="relative h-10 w-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
              <Shimmer />
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
