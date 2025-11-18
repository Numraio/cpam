import { Shimmer } from './Shimmer';

interface SkeletonChartProps {
  /** Chart height in pixels (default: 300) */
  height?: number;
  /** Chart type (default: 'line') */
  type?: 'line' | 'bar' | 'area' | 'pie';
  /** Show legend (default: true) */
  showLegend?: boolean;
}

/**
 * Skeleton Chart Component
 *
 * Loading state for chart components matching the chart layout.
 * Displays animated bars/lines that approximate the final chart appearance.
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <SkeletonChart type="line" height={400} />
 * ) : (
 *   <LineChart data={data} />
 * )}
 * ```
 */
export function SkeletonChart({
  height = 300,
  type = 'line',
  showLegend = true,
}: SkeletonChartProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      {showLegend && (
        <div className="flex items-center gap-6 mb-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex items-center gap-2 animate-pulse">
              <div className="relative h-2 w-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <Shimmer />
              </div>
              <div className="relative h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                <Shimmer />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="relative" style={{ height: `${height}px` }}>
        {type === 'line' && <SkeletonLineChart />}
        {type === 'bar' && <SkeletonBarChart />}
        {type === 'area' && <SkeletonAreaChart />}
        {type === 'pie' && <SkeletonPieChart />}
      </div>
    </div>
  );
}

function SkeletonLineChart() {
  const points = Array.from({ length: 8 }).map(() => Math.random() * 60 + 20);

  return (
    <div className="w-full h-full flex items-end gap-4 animate-pulse">
      {points.map((height, index) => (
        <div key={index} className="flex-1 flex flex-col justify-end">
          <div
            className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-t overflow-hidden"
            style={{ height: `${height}%` }}
          >
            <Shimmer />
          </div>
        </div>
      ))}
    </div>
  );
}

function SkeletonBarChart() {
  const bars = Array.from({ length: 8 }).map(() => Math.random() * 60 + 20);

  return (
    <div className="w-full h-full flex items-end gap-3 animate-pulse">
      {bars.map((height, index) => (
        <div
          key={index}
          className="relative flex-1 bg-gray-200 dark:bg-gray-700 rounded-t overflow-hidden"
          style={{ height: `${height}%` }}
        >
          <Shimmer />
        </div>
      ))}
    </div>
  );
}

function SkeletonAreaChart() {
  return (
    <div className="w-full h-full animate-pulse">
      <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
        <defs>
          <linearGradient id="skeletonGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="text-gray-200 dark:text-gray-700" stopColor="currentColor" stopOpacity="0.4" />
            <stop offset="100%" className="text-gray-200 dark:text-gray-700" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 150 Q 50 100 100 120 T 200 100 T 300 130 T 400 110 L 400 200 L 0 200 Z"
          fill="url(#skeletonGradient)"
          className="text-gray-200 dark:text-gray-700"
        />
      </svg>
    </div>
  );
}

function SkeletonPieChart() {
  return (
    <div className="w-full h-full flex items-center justify-center animate-pulse">
      <div className="relative w-48 h-48 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <Shimmer />
      </div>
    </div>
  );
}
