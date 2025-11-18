import { LockClosedIcon } from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';

interface NoAccessProps {
  /** Resource type that user doesn't have access to */
  resourceType?: string;
  /** Custom title (overrides default) */
  title?: string;
  /** Custom description (overrides default) */
  description?: string;
  /** Action to request access */
  onRequestAccess?: () => void;
}

/**
 * No Access Component
 *
 * Empty state for when user lacks permission to view a resource.
 * Provides clear messaging about access restrictions.
 *
 * @example
 * ```tsx
 * <NoAccess
 *   resourceType="team settings"
 *   onRequestAccess={() => router.push('/request-access')}
 * />
 * ```
 */
export function NoAccess({
  resourceType = 'this resource',
  title,
  description,
  onRequestAccess,
}: NoAccessProps) {
  return (
    <EmptyState
      icon={<LockClosedIcon />}
      title={title || 'Access restricted'}
      description={
        description ||
        `You don't have permission to view ${resourceType}. Contact your team administrator to request access.`
      }
      action={
        onRequestAccess
          ? {
              label: 'Request access',
              onClick: onRequestAccess,
              variant: 'secondary',
            }
          : undefined
      }
    />
  );
}
