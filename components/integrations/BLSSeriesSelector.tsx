/**
 * BLS Series Selector Component
 * Allows users to search and select BLS series for import
 */

import { useState, useEffect } from 'react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { Input } from '@/components/ui/Input';
import { Select, SelectOption } from '@/components/ui/Select';
import { Card, CardBody } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/empty-states/ErrorState';
import { NoResults } from '@/components/ui/empty-states/NoResults';

interface BLSSeriesOption {
  value: string;
  label: string;
  description: string;
  category: string;
  frequency: string;
  seasonalAdjustment: string;
}

interface BLSSeriesSelectorProps {
  onSelect: (seriesId: string, seriesInfo: BLSSeriesOption) => void;
  selectedSeriesId?: string;
  className?: string;
}

export default function BLSSeriesSelector({
  onSelect,
  selectedSeriesId,
  className = '',
}: BLSSeriesSelectorProps) {
  const [series, setSeries] = useState<BLSSeriesOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  // Fetch BLS series catalog
  useEffect(() => {
    async function fetchSeries() {
      try {
        setLoading(true);
        const response = await fetch('/api/integrations/bls/series');
        if (!response.ok) {
          throw new Error('Failed to fetch BLS series');
        }
        const result = await response.json();
        setSeries(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchSeries();
  }, []);

  // Filter series based on search and category
  const filteredSeries = series.filter((s) => {
    const matchesSearch =
      searchQuery === '' ||
      s.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.value.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' || s.category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Get unique categories
  const categories = ['ALL', ...Array.from(new Set(series.map((s) => s.category)))];
  const categoryOptions: SelectOption[] = categories.map((cat) => ({
    value: cat,
    label: cat === 'ALL' ? 'All Categories' : cat,
  }));

  const handleSelect = (seriesOption: BLSSeriesOption) => {
    onSelect(seriesOption.value, seriesOption);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('ALL');
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <svg
          className="animate-spin h-8 w-8 text-primary-600 dark:text-primary-400"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="ml-3 text-gray-700 dark:text-gray-300">
          Loading BLS series catalog...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <ErrorState
          title="Failed to load BLS series"
          description={`Error: ${error}`}
          onRetry={() => window.location.reload()}
        />
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and Filter Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Input
          label="Search BLS Series"
          type="text"
          placeholder="Search by name, description, or series ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoComplete="off"
        />

        <Select
          label="Filter by Category"
          value={categoryFilter}
          onValueChange={setCategoryFilter}
          options={categoryOptions}
        />
      </div>

      {/* Series List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredSeries.length === 0 ? (
          <NoResults
            searchQuery={searchQuery !== '' ? searchQuery : undefined}
            onClear={searchQuery !== '' || categoryFilter !== 'ALL' ? handleClearFilters : undefined}
          />
        ) : (
          filteredSeries.map((seriesOption) => (
            <Card
              key={seriesOption.value}
              variant="outlined"
              className={`cursor-pointer transition-all hover:shadow-md hover:border-primary-300 dark:hover:border-primary-700 ${
                selectedSeriesId === seriesOption.value
                  ? 'border-primary-600 dark:border-primary-500 shadow-md bg-primary-50 dark:bg-primary-900/10'
                  : ''
              }`}
              onClick={() => handleSelect(seriesOption)}
            >
              <CardBody className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base text-gray-900 dark:text-gray-100">
                      {seriesOption.label}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {seriesOption.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-300">
                        {seriesOption.category}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-600">
                        {seriesOption.value}
                      </span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {seriesOption.frequency}
                      </span>
                      {seriesOption.seasonalAdjustment && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {seriesOption.seasonalAdjustment}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedSeriesId === seriesOption.value && (
                    <div className="ml-4">
                      <CheckCircleIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Results Count */}
      <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 text-center">
        Showing {filteredSeries.length} of {series.length} series
      </div>
    </div>
  );
}
