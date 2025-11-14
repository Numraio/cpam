import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

/**
 * Spinner Component
 *
 * Animated loading spinner with multiple variants and sizes.
 * Inspired by Linear and modern web applications.
 */

export interface SpinnerProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Spinner size */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Spinner variant */
  variant?: 'circular' | 'dots' | 'pulse' | 'bars';
  /** Color variant */
  color?: 'primary' | 'white' | 'gray';
  /** Label text (for accessibility) */
  label?: string;
}

/**
 * Spinner component
 *
 * @example
 * ```tsx
 * <Spinner size="md" variant="circular" />
 * <Spinner size="lg" variant="dots" color="primary" />
 * <Spinner variant="pulse" label="Loading data..." />
 * ```
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(
  (
    {
      className,
      size = 'md',
      variant = 'circular',
      color = 'primary',
      label = 'Loading...',
      ...props
    },
    ref
  ) => {
    const sizeMap = {
      sm: 16,
      md: 24,
      lg: 32,
      xl: 48,
    };

    const colorClass = {
      primary: 'text-primary-600',
      white: 'text-white',
      gray: 'text-gray-600',
    }[color];

    const spinnerSize = sizeMap[size];

    // Circular spinner (default)
    if (variant === 'circular') {
      return (
        <div
          ref={ref}
          role="status"
          aria-label={label}
          className={cn('inline-flex items-center justify-center', className)}
          {...props}
        >
          <motion.svg
            width={spinnerSize}
            height={spinnerSize}
            viewBox="0 0 24 24"
            fill="none"
            className={colorClass}
            animate={{ rotate: 360 }}
            transition={{
              duration: 1,
              ease: 'linear',
              repeat: Infinity,
            }}
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              strokeOpacity="0.25"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </motion.svg>
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    // Dots spinner
    if (variant === 'dots') {
      const dotSize = spinnerSize / 6;
      const spacing = spinnerSize / 4;

      return (
        <div
          ref={ref}
          role="status"
          aria-label={label}
          className={cn('inline-flex items-center gap-1', className)}
          style={{ gap: `${spacing / 4}px` }}
          {...props}
        >
          {[0, 1, 2].map((index) => (
            <motion.div
              key={index}
              className={cn('rounded-full', colorClass)}
              style={{
                width: dotSize,
                height: dotSize,
                backgroundColor: 'currentColor',
              }}
              animate={{
                scale: [1, 1.2, 1],
                opacity: [1, 0.5, 1],
              }}
              transition={{
                duration: 0.8,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: index * 0.15,
              }}
            />
          ))}
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    // Pulse spinner
    if (variant === 'pulse') {
      return (
        <div
          ref={ref}
          role="status"
          aria-label={label}
          className={cn('inline-flex items-center justify-center', className)}
          {...props}
        >
          <motion.div
            className={cn('rounded-full', colorClass)}
            style={{
              width: spinnerSize,
              height: spinnerSize,
              backgroundColor: 'currentColor',
            }}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [1, 0.6, 1],
            }}
            transition={{
              duration: 1,
              ease: 'easeInOut',
              repeat: Infinity,
            }}
          />
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    // Bars spinner
    if (variant === 'bars') {
      const barWidth = spinnerSize / 8;
      const barSpacing = spinnerSize / 6;

      return (
        <div
          ref={ref}
          role="status"
          aria-label={label}
          className={cn('inline-flex items-end gap-1', className)}
          style={{ gap: `${barSpacing / 4}px`, height: spinnerSize }}
          {...props}
        >
          {[0, 1, 2, 3].map((index) => (
            <motion.div
              key={index}
              className={cn(colorClass)}
              style={{
                width: barWidth,
                backgroundColor: 'currentColor',
              }}
              animate={{
                height: [`${spinnerSize * 0.4}px`, `${spinnerSize}px`, `${spinnerSize * 0.4}px`],
              }}
              transition={{
                duration: 0.8,
                ease: 'easeInOut',
                repeat: Infinity,
                delay: index * 0.1,
              }}
            />
          ))}
          <span className="sr-only">{label}</span>
        </div>
      );
    }

    return null;
  }
);

Spinner.displayName = 'Spinner';

/**
 * Spinner Overlay - Full screen loading overlay
 */
export interface SpinnerOverlayProps {
  /** Show overlay */
  show: boolean;
  /** Overlay message */
  message?: string;
  /** Spinner size */
  size?: SpinnerProps['size'];
  /** Spinner variant */
  variant?: SpinnerProps['variant'];
}

export const SpinnerOverlay = forwardRef<HTMLDivElement, SpinnerOverlayProps>(
  ({ show, message, size = 'lg', variant = 'circular' }, ref) => {
    if (!show) return null;

    return (
      <motion.div
        ref={ref}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <motion.div
          className="flex flex-col items-center gap-4 rounded-lg bg-white dark:bg-gray-800 p-6 shadow-xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Spinner size={size} variant={variant} color="primary" />
          {message && (
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {message}
            </p>
          )}
        </motion.div>
      </motion.div>
    );
  }
);

SpinnerOverlay.displayName = 'SpinnerOverlay';
