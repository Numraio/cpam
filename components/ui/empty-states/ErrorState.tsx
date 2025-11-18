import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';

interface ErrorStateProps {
  /** Error title */
  title?: string;
  /** Error description/message */
  description?: string;
  /** Retry action */
  onRetry?: () => void;
  /** Action to report/contact support */
  onContact?: () => void;
}

/**
 * Error State Component
 *
 * Empty state for when data fails to load due to an error.
 * Provides helpful messaging and retry action.
 *
 * @example
 * ```tsx
 * <ErrorState
 *   title="Failed to load data"
 *   description="An error occurred while fetching your data"
 *   onRetry={() => refetch()}
 * />
 * ```
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We encountered an error while loading this data. Please try again.',
  onRetry,
  onContact,
}: ErrorStateProps) {
  return (
    <EmptyState
      icon={<ExclamationTriangleIcon className="text-error" />}
      title={title}
      description={description}
      action={
        onRetry
          ? {
              label: 'Try again',
              onClick: onRetry,
              variant: 'primary',
            }
          : undefined
      }
      secondaryAction={
        onContact
          ? {
              label: 'Contact support',
              onClick: onContact,
            }
          : undefined
      }
    />
  );
}
