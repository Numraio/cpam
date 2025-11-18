import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';

interface NoResultsProps {
  /** Search query that returned no results */
  searchQuery?: string;
  /** Action to clear filters/search */
  onClear?: () => void;
  /** Custom title (overrides default) */
  title?: string;
  /** Custom description (overrides default) */
  description?: string;
}

/**
 * No Results Component
 *
 * Empty state for when search or filters return no matches.
 * Helps users understand why they're seeing an empty state.
 *
 * @example
 * ```tsx
 * <NoResults
 *   searchQuery="test query"
 *   onClear={() => setSearchQuery('')}
 * />
 * ```
 */
export function NoResults({
  searchQuery,
  onClear,
  title,
  description,
}: NoResultsProps) {
  const defaultTitle = searchQuery
    ? `No results for "${searchQuery}"`
    : 'No results found';

  const defaultDescription = searchQuery
    ? 'Try adjusting your search or filter to find what you\'re looking for.'
    : 'No items match your current filters. Try adjusting or clearing your filters.';

  return (
    <EmptyState
      icon={<MagnifyingGlassIcon />}
      title={title || defaultTitle}
      description={description || defaultDescription}
      action={
        onClear
          ? {
              label: 'Clear filters',
              onClick: onClear,
              variant: 'secondary',
            }
          : undefined
      }
      size="sm"
    />
  );
}
