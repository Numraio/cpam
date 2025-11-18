import { ReactNode } from 'react';
import { Button } from '../Button';

interface EmptyStateProps {
  /** Icon component to display */
  icon?: ReactNode;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Primary action button */
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
  };
  /** Secondary action button */
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  /** Optional illustration image path */
  illustration?: string;
  /** Size variant (default: 'default') */
  size?: 'sm' | 'default' | 'lg';
}

/**
 * Empty State Component
 *
 * Generic empty state component for displaying when no data is available.
 * Provides contextual messaging and call-to-action buttons.
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<DocumentIcon className="h-12 w-12" />}
 *   title="No documents yet"
 *   description="Get started by uploading your first document"
 *   action={{
 *     label: "Upload Document",
 *     onClick: () => router.push('/upload')
 *   }}
 * />
 * ```
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  illustration,
  size = 'default',
}: EmptyStateProps) {
  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'h-10 w-10',
      title: 'text-base',
      description: 'text-sm',
      maxWidth: 'max-w-sm',
    },
    default: {
      container: 'py-12',
      icon: 'h-12 w-12',
      title: 'text-lg',
      description: 'text-base',
      maxWidth: 'max-w-md',
    },
    lg: {
      container: 'py-16',
      icon: 'h-16 w-16',
      title: 'text-xl',
      description: 'text-lg',
      maxWidth: 'max-w-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-col items-center justify-center ${classes.container}`}>
      {illustration && (
        <img
          src={illustration}
          alt=""
          className="w-64 h-64 mb-6 opacity-80"
          aria-hidden="true"
        />
      )}

      {!illustration && icon && (
        <div className={`${classes.icon} text-gray-400 dark:text-gray-600 mb-4`} aria-hidden="true">
          {icon}
        </div>
      )}

      <h3 className={`${classes.title} font-semibold text-gray-900 dark:text-gray-100 mb-2`}>
        {title}
      </h3>

      {description && (
        <p className={`${classes.description} text-gray-600 dark:text-gray-400 text-center ${classes.maxWidth} mb-6`}>
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button
              variant={action.variant || 'primary'}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
