import { PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { EmptyState } from './EmptyState';

interface NoDataProps {
  /** Entity type (e.g., "PAM", "Item", "Calculation") */
  entityType: string;
  /** Plural form of entity type */
  entityTypePlural?: string;
  /** Action to create new entity */
  onCreate?: () => void;
  /** Custom title (overrides default) */
  title?: string;
  /** Custom description (overrides default) */
  description?: string;
}

/**
 * No Data Component
 *
 * Empty state for first-time users who haven't created any entities yet.
 * Encourages users to take action with a prominent create button.
 *
 * @example
 * ```tsx
 * <NoData
 *   entityType="PAM"
 *   entityTypePlural="PAMs"
 *   onCreate={() => router.push('/pams/new')}
 * />
 * ```
 */
export function NoData({
  entityType,
  entityTypePlural,
  onCreate,
  title,
  description,
}: NoDataProps) {
  const plural = entityTypePlural || `${entityType}s`;

  return (
    <EmptyState
      icon={<FolderIcon />}
      title={title || `No ${plural} yet`}
      description={
        description ||
        `Get started by creating your first ${entityType.toLowerCase()}. ${entityType}s will appear here once created.`
      }
      action={
        onCreate
          ? {
              label: `Create ${entityType}`,
              onClick: onCreate,
              variant: 'primary',
            }
          : undefined
      }
    />
  );
}
