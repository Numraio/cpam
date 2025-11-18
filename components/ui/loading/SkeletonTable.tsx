import { Shimmer } from './Shimmer';

interface SkeletonTableProps {
  /** Number of rows to display (default: 5) */
  rows?: number;
  /** Number of columns to display (default: 5) */
  columns?: number;
  /** Show table header (default: true) */
  showHeader?: boolean;
  /** Show action column (default: true) */
  showActions?: boolean;
}

/**
 * Skeleton Table Component
 *
 * Loading state for table components matching the standard table layout.
 * Displays animated skeleton rows while data is being fetched.
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <SkeletonTable rows={10} columns={6} />
 * ) : (
 *   <DataTable data={data} />
 * )}
 * ```
 */
export function SkeletonTable({
  rows = 5,
  columns = 5,
  showHeader = true,
  showActions = true,
}: SkeletonTableProps) {
  const totalColumns = showActions ? columns + 1 : columns;

  return (
    <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        {showHeader && (
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              {Array.from({ length: totalColumns }).map((_, index) => (
                <th key={index} className="px-6 py-3">
                  <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                    <Shimmer />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} className="animate-pulse">
              {Array.from({ length: totalColumns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4 whitespace-nowrap">
                  <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                    <Shimmer />
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
