/**
 * BLS Series Selector Component
 * Allows users to search and select BLS series for import
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

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

  const handleSelect = (seriesOption: BLSSeriesOption) => {
    onSelect(seriesOption.value, seriesOption);
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center py-8 ${className}`}>
        <div className="loading loading-spinner loading-lg"></div>
        <span className="ml-3 text-base-content">Loading BLS series catalog...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`alert alert-error ${className}`}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>Error loading BLS series: {error}</span>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Search and Filter Controls */}
      <div className="mb-4 space-y-3">
        <div>
          <label className="label">
            <span className="label-text font-medium">Search BLS Series</span>
          </label>
          <input
            type="text"
            placeholder="Search by name, description, or series ID..."
            className="input input-bordered w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div>
          <label className="label">
            <span className="label-text font-medium">Filter by Category</span>
          </label>
          <select
            className="select select-bordered w-full"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Series List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredSeries.length === 0 ? (
          <div className="text-center py-8 text-base-content/60">
            No series found matching your search criteria.
          </div>
        ) : (
          filteredSeries.map((seriesOption) => (
            <div
              key={seriesOption.value}
              className={`card bg-base-100 border border-base-300 hover:border-primary hover:shadow-md transition-all cursor-pointer ${
                selectedSeriesId === seriesOption.value ? 'border-primary shadow-md' : ''
              }`}
              onClick={() => handleSelect(seriesOption)}
            >
              <div className="card-body p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{seriesOption.label}</h3>
                    <p className="text-sm text-base-content/70 mt-1">
                      {seriesOption.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="badge badge-primary badge-sm">
                        {seriesOption.category}
                      </span>
                      <span className="badge badge-outline badge-sm">
                        {seriesOption.value}
                      </span>
                      <span className="badge badge-ghost badge-sm">
                        {seriesOption.frequency}
                      </span>
                      {seriesOption.seasonalAdjustment && (
                        <span className="badge badge-ghost badge-sm">
                          {seriesOption.seasonalAdjustment}
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedSeriesId === seriesOption.value && (
                    <div className="ml-3">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-primary"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Results Count */}
      <div className="mt-4 text-sm text-base-content/60 text-center">
        Showing {filteredSeries.length} of {series.length} series
      </div>
    </div>
  );
}
