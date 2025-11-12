import { forwardRef, HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

/**
 * Card Component
 *
 * Modern card with variants and optional interactive states.
 * Inspired by Material Design 3 elevated surfaces.
 */

const cardVariants = cva(
  // Base styles
  'rounded-lg bg-white transition-all duration-normal',
  {
    variants: {
      variant: {
        default: 'border border-gray-200',
        elevated: 'shadow-md',
        outlined: 'border-2 border-gray-300',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-lg hover:-translate-y-1',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'elevated',
      padding: 'md',
      interactive: false,
    },
  }
);

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Make the card clickable with hover effect */
  interactive?: boolean;
  /** As motion component for animations */
  animated?: boolean;
}

/**
 * Card component
 *
 * @example
 * ```tsx
 * <Card variant="elevated" padding="md">
 *   <h3>Card Title</h3>
 *   <p>Card content goes here</p>
 * </Card>
 *
 * <Card interactive onClick={handleClick}>
 *   <p>Clickable card with hover effect</p>
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, variant, padding, interactive, animated = true, children, ...props },
    ref
  ) => {
    const Component = animated ? motion.div : 'div';
    const motionProps = animated
      ? {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          whileHover: interactive ? { scale: 1.01, y: -4 } : undefined,
          whileTap: interactive ? { scale: 0.99 } : undefined,
        }
      : {};

    return (
      <Component
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, interactive: interactive ?? false, className })
        )}
        {...motionProps}
        {...props}
      >
        {children}
      </Component>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header - Title and optional description
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Title text */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional action (button, icon, etc.) */
  action?: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-start justify-between mb-4', className)}
        {...props}
      >
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {action && <div className="ml-4">{action}</div>}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Body - Main content area
 */
export const CardBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardBody.displayName = 'CardBody';

/**
 * Card Footer - Actions or metadata
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  /** Align content to start, center, or end */
  align?: 'start' | 'center' | 'end' | 'between';
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, align = 'end', children, ...props }, ref) => {
    const alignClass = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between',
    }[align];

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center gap-2 mt-6 pt-4 border-t border-gray-200',
          alignClass,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/**
 * KPI Card - For dashboard metrics
 */
export interface KPICardProps {
  /** Metric label */
  label: string;
  /** Metric value */
  value: string | number;
  /** Optional change indicator (+5%, -2%, etc.) */
  change?: {
    value: string;
    trend: 'up' | 'down' | 'neutral';
  };
  /** Optional icon */
  icon?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
}

export const KPICard = forwardRef<HTMLDivElement, KPICardProps>(
  ({ label, value, change, icon, onClick }, ref) => {
    const trendColor = {
      up: 'text-success',
      down: 'text-error',
      neutral: 'text-gray-600',
    }[change?.trend || 'neutral'];

    return (
      <Card
        ref={ref}
        interactive={!!onClick}
        onClick={onClick}
        className="relative overflow-hidden"
      >
        {icon && (
          <div className="absolute top-4 right-4 text-gray-400 opacity-20">
            {icon}
          </div>
        )}
        <div className="relative z-10">
          <p className="text-sm font-medium text-gray-600 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {change && (
            <div className={cn('flex items-center gap-1 mt-2 text-sm', trendColor)}>
              {change.trend === 'up' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {change.trend === 'down' && (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              <span className="font-medium">{change.value}</span>
            </div>
          )}
        </div>
      </Card>
    );
  }
);

KPICard.displayName = 'KPICard';
