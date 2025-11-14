import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

/**
 * Skeleton Component
 *
 * Animated skeleton loader with shimmer effect for loading states.
 * Inspired by Linear and modern web applications.
 */

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Skeleton variant */
  variant?: 'text' | 'circular' | 'rectangular';
  /** Width (can be number for pixels or string for %) */
  width?: string | number;
  /** Height (can be number for pixels or string for %) */
  height?: string | number;
  /** Disable shimmer animation */
  noAnimation?: boolean;
}

/**
 * Skeleton loader component
 *
 * @example
 * ```tsx
 * // Text line skeleton
 * <Skeleton variant="text" width="80%" />
 *
 * // Avatar skeleton
 * <Skeleton variant="circular" width={40} height={40} />
 *
 * // Card skeleton
 * <Skeleton variant="rectangular" width="100%" height={200} />
 * ```
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      width,
      height,
      noAnimation = false,
      style,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      text: 'rounded h-4',
      circular: 'rounded-full',
      rectangular: 'rounded-lg',
    };

    const finalStyle = {
      width: typeof width === 'number' ? `${width}px` : width,
      height: typeof height === 'number' ? `${height}px` : height,
      ...style,
    };

    if (noAnimation) {
      return (
        <div
          ref={ref}
          className={cn(
            'bg-gray-200 dark:bg-gray-700',
            variantStyles[variant],
            className
          )}
          style={finalStyle}
          {...props}
        />
      );
    }

    return (
      <motion.div
        ref={ref}
        className={cn(
          'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700',
          'bg-[length:200%_100%]',
          variantStyles[variant],
          className
        )}
        style={finalStyle}
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%'],
        }}
        transition={{
          duration: 1.5,
          ease: 'linear',
          repeat: Infinity,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = 'Skeleton';

/**
 * Skeleton Text - For loading text content
 */
export interface SkeletonTextProps {
  /** Number of lines */
  lines?: number;
  /** Width of last line (%) */
  lastLineWidth?: string;
  /** Space between lines */
  spacing?: 'sm' | 'md' | 'lg';
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  ({ lines = 3, lastLineWidth = '60%', spacing = 'md' }, ref) => {
    const spacingClass = {
      sm: 'space-y-2',
      md: 'space-y-3',
      lg: 'space-y-4',
    }[spacing];

    return (
      <div ref={ref} className={cn('w-full', spacingClass)}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            width={index === lines - 1 ? lastLineWidth : '100%'}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

/**
 * Skeleton Card - For loading card content
 */
export interface SkeletonCardProps {
  /** Show avatar */
  hasAvatar?: boolean;
  /** Number of text lines */
  lines?: number;
  /** Show action buttons */
  hasActions?: boolean;
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  ({ hasAvatar = false, lines = 3, hasActions = false }, ref) => {
    return (
      <div
        ref={ref}
        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6"
      >
        {/* Header with optional avatar */}
        {hasAvatar && (
          <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circular" width={40} height={40} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" width="40%" />
              <Skeleton variant="text" width="30%" />
            </div>
          </div>
        )}

        {/* Text content */}
        <SkeletonText lines={lines} spacing="md" />

        {/* Actions */}
        {hasActions && (
          <div className="flex gap-2 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <Skeleton variant="rectangular" width={80} height={36} />
            <Skeleton variant="rectangular" width={80} height={36} />
          </div>
        )}
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';

/**
 * Skeleton Table - For loading table content
 */
export interface SkeletonTableProps {
  /** Number of rows */
  rows?: number;
  /** Number of columns */
  columns?: number;
  /** Show header row */
  hasHeader?: boolean;
}

export const SkeletonTable = forwardRef<HTMLDivElement, SkeletonTableProps>(
  ({ rows = 5, columns = 4, hasHeader = true }, ref) => {
    return (
      <div ref={ref} className="w-full">
        {/* Header */}
        {hasHeader && (
          <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, index) => (
              <Skeleton key={`header-${index}`} variant="text" width="60%" height={16} />
            ))}
          </div>
        )}

        {/* Rows */}
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-4"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  variant="text"
                  width={colIndex === 0 ? '80%' : '60%'}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }
);

SkeletonTable.displayName = 'SkeletonTable';
