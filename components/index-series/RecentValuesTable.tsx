/**
 * Recent Values Table Component
 * Displays the most recent price values for an IndexSeries
 */

import { useState, useEffect } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { format, formatDistance } from 'date-fns';

interface PriceValue {
  id: string;
  date: string;
  value: number;
}

interface RecentValuesTableProps {
  indexSeriesId: string;
  teamSlug: string;
  unit?: string;
  limit?: number;
  className?: string;
}

export default function RecentValuesTable({
  indexSeriesId,
  teamSlug,
  unit,
  limit = 20,
  className = '',
}: RecentValuesTableProps) {
  const [values, setValues] = useState<PriceValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch recent values
  const fetchValues = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        orderBy: 'date',
        order: 'desc', // Descending for recent first
        limit: limit.toString(),
      });

      const response = await fetch(
        `/api/teams/${teamSlug}/index-series/${indexSeriesId}/values?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recent values');
      }

      const result = await response.json();
      setValues(result.values || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchValues();
  }, [indexSeriesId, limit]);

  // Loading state
  if (loading) {
    return (
      <Card variant="elevated" className={className}>
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Values</h2>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading recent values...</span>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card variant="elevated" className={className}>
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Values</h2>
          <Card variant="bordered" className="border-l-4 border-l-error">
            <CardBody className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Failed to load recent values: {error}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={fetchValues}
                >
                  Retry
                </Button>
              </div>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    );
  }

  // Empty state
  if (values.length === 0) {
    return (
      <Card variant="elevated" className={className}>
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Recent Values</h2>
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p className="font-medium">No price values found for this series</p>
            <p className="text-sm mt-2">Historical price data will appear here once ingested</p>
          </div>
        </CardBody>
      </Card>
    );
  }

  // Table view
  return (
    <Card variant="elevated" className={className}>
      <CardBody>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Recent Values</h2>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
            onClick={fetchValues}
            title="Refresh values"
          >
            Refresh
          </Button>
        </div>

        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Time Ago
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {values.map((v) => {
                const valueDate = new Date(v.date);
                return (
                  <tr
                    key={v.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-normal"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {format(valueDate, 'MMM dd, yyyy')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                        {v.value.toFixed(3)}
                      </span>
                      {unit && (
                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                          {unit}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistance(valueDate, new Date(), { addSuffix: true })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {values.length} most recent value{values.length !== 1 ? 's' : ''}
        </div>
      </CardBody>
    </Card>
  );
}
