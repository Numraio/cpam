/**
 * Price History Chart Component
 * Interactive time series visualization for IndexSeries price data
 */

import { useState, useEffect } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subMonths, subYears } from 'date-fns';

interface PriceValue {
  id: string;
  date: string;
  value: number;
}

interface PriceHistoryChartProps {
  indexSeriesId: string;
  teamSlug: string;
  unit?: string;
  className?: string;
}

type DateRange = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'ALL';

export default function PriceHistoryChart({
  indexSeriesId,
  teamSlug,
  unit,
  className = '',
}: PriceHistoryChartProps) {
  const [values, setValues] = useState<PriceValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState<DateRange>('ALL');

  // Calculate date range based on selection
  const getDateRange = (range: DateRange): { startDate?: Date; endDate?: Date } => {
    const now = new Date();
    switch (range) {
      case '1M':
        return { startDate: subMonths(now, 1), endDate: now };
      case '3M':
        return { startDate: subMonths(now, 3), endDate: now };
      case '6M':
        return { startDate: subMonths(now, 6), endDate: now };
      case '1Y':
        return { startDate: subYears(now, 1), endDate: now };
      case '5Y':
        return { startDate: subYears(now, 5), endDate: now };
      case 'ALL':
        return {};
      default:
        return { startDate: subYears(now, 1), endDate: now };
    }
  };

  // Fetch price values
  const fetchValues = async (range: DateRange = selectedRange) => {
    try {
      setLoading(true);
      setError(null);

      const { startDate, endDate } = getDateRange(range);
      const params = new URLSearchParams({
        orderBy: 'date',
        order: 'asc', // Ascending for chart
      });

      if (startDate) {
        params.append('startDate', startDate.toISOString());
      }
      if (endDate) {
        params.append('endDate', endDate.toISOString());
      }

      const response = await fetch(
        `/api/teams/${teamSlug}/index-series/${indexSeriesId}/values?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch price values');
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
    fetchValues(selectedRange);
  }, [indexSeriesId, selectedRange]);

  // Handle range change
  const handleRangeChange = (range: DateRange) => {
    setSelectedRange(range);
  };

  // Format chart data
  const chartData = values.map((v) => ({
    date: new Date(v.date).getTime(),
    dateStr: format(new Date(v.date), 'MMM dd, yyyy'),
    value: v.value,
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {payload[0].payload.dateStr}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Value: <span className="font-semibold text-primary-600 dark:text-primary-400">
              {payload[0].value.toFixed(3)}
            </span>
            {unit && <span className="ml-1">{unit}</span>}
          </p>
        </div>
      );
    }
    return null;
  };

  // Format X-axis tick
  const formatXAxis = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM yyyy');
  };

  // Loading state
  if (loading) {
    return (
      <Card variant="elevated" className={className}>
        <CardBody>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Price History</h2>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading chart data...</span>
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Price History</h2>
          <Card variant="bordered" className="border-l-4 border-l-error">
            <CardBody className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  Failed to load chart data: {error}
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                  onClick={() => fetchValues(selectedRange)}
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
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Price History</h2>
          <Card variant="bordered" className="border-l-4 border-l-warning">
            <CardBody className="flex items-start gap-3">
              <ExclamationTriangleIcon className="h-6 w-6 text-warning flex-shrink-0 mt-0.5" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                No price data available for the selected time range. Data will appear here after ingestion.
              </p>
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    );
  }

  // Chart view
  return (
    <Card variant="elevated" className={className}>
      <CardBody>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Price History</h2>

          {/* Date Range Selector */}
          <div className="flex gap-2">
            {(['1M', '3M', '6M', '1Y', '5Y', 'ALL'] as DateRange[]).map((range) => (
              <button
                key={range}
                onClick={() => handleRangeChange(range)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors duration-normal ${
                  selectedRange === range
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                dataKey="date"
                tickFormatter={formatXAxis}
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke="#6B7280"
                style={{ fontSize: '12px' }}
                tickFormatter={(value) => value.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#7C3AED"
                strokeWidth={2}
                dot={{ r: 3, fill: '#7C3AED' }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart Info */}
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {values.length} data point{values.length !== 1 ? 's' : ''} for {selectedRange === 'ALL' ? 'all time' : `last ${selectedRange}`}
        </div>
      </CardBody>
    </Card>
  );
}
