import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils/cn';
import { motion } from 'framer-motion';

/**
 * Progress Component
 *
 * Animated progress bar with multiple variants.
 * Inspired by Linear and modern web applications.
 */

export interface ProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Progress bar size */
  size?: 'sm' | 'md' | 'lg';
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Show percentage label */
  showLabel?: boolean;
  /** Indeterminate loading state */
  indeterminate?: boolean;
  /** Striped pattern */
  striped?: boolean;
  /** Animated stripes */
  animated?: boolean;
}

/**
 * Progress bar component
 *
 * @example
 * ```tsx
 * <Progress value={75} />
 * <Progress value={50} variant="success" showLabel />
 * <Progress indeterminate />
 * <Progress value={60} striped animated />
 * ```
 */
export const Progress = forwardRef<HTMLDivElement, ProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 'md',
      variant = 'primary',
      showLabel = false,
      indeterminate = false,
      striped = false,
      animated = false,
      ...props
    },
    ref
  ) => {
    const percentage = indeterminate ? 100 : Math.min(Math.max((value / max) * 100, 0), 100);

    const sizeClasses = {
      sm: 'h-1',
      md: 'h-2',
      lg: 'h-3',
    }[size];

    const variantClasses = {
      primary: 'bg-primary-600',
      success: 'bg-success',
      warning: 'bg-warning',
      error: 'bg-error',
    }[variant];

    const stripedPattern = striped || animated
      ? 'bg-gradient-to-r from-transparent via-white/20 to-transparent bg-[length:40px_100%]'
      : '';

    return (
      <div ref={ref} className="w-full" {...props}>
        {/* Label */}
        {showLabel && !indeterminate && (
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Progress
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          </div>
        )}

        {/* Progress bar track */}
        <div
          className={cn(
            'w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700',
            sizeClasses,
            className
          )}
          role="progressbar"
          aria-valuenow={indeterminate ? undefined : value}
          aria-valuemin={0}
          aria-valuemax={max}
        >
          {/* Progress bar fill */}
          {indeterminate ? (
            <motion.div
              className={cn('h-full rounded-full', variantClasses)}
              style={{ width: '30%' }}
              animate={{
                x: ['-100%', '400%'],
              }}
              transition={{
                duration: 1.5,
                ease: 'linear',
                repeat: Infinity,
              }}
            />
          ) : (
            <motion.div
              className={cn('h-full rounded-full', variantClasses, stripedPattern)}
              initial={{ width: 0 }}
              animate={{
                width: `${percentage}%`,
                backgroundPosition: animated ? ['0% 0%', '40px 0%'] : undefined,
              }}
              transition={{
                width: { duration: 0.5, ease: [0.4, 0, 0.2, 1] },
                backgroundPosition: animated
                  ? { duration: 1, ease: 'linear', repeat: Infinity }
                  : undefined,
              }}
            />
          )}
        </div>
      </div>
    );
  }
);

Progress.displayName = 'Progress';

/**
 * Circular Progress - Circular progress indicator
 */
export interface CircularProgressProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Progress value (0-100) */
  value: number;
  /** Maximum value (default: 100) */
  max?: number;
  /** Circle size */
  size?: number;
  /** Stroke width */
  strokeWidth?: number;
  /** Color variant */
  variant?: 'primary' | 'success' | 'warning' | 'error';
  /** Show percentage label */
  showLabel?: boolean;
  /** Indeterminate loading state */
  indeterminate?: boolean;
}

export const CircularProgress = forwardRef<HTMLDivElement, CircularProgressProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 64,
      strokeWidth = 6,
      variant = 'primary',
      showLabel = false,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const percentage = indeterminate ? 75 : Math.min(Math.max((value / max) * 100, 0), 100);
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    const variantColors = {
      primary: 'text-primary-600',
      success: 'text-success',
      warning: 'text-warning',
      error: 'text-error',
    }[variant];

    return (
      <div
        ref={ref}
        className={cn('inline-flex items-center justify-center', className)}
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        {...props}
      >
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200 dark:text-gray-700"
          />

          {/* Progress circle */}
          {indeterminate ? (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className={variantColors}
              strokeDasharray={circumference}
              animate={{
                strokeDashoffset: [circumference, 0],
                rotate: [0, 360],
              }}
              transition={{
                strokeDashoffset: { duration: 1.5, ease: 'easeInOut', repeat: Infinity },
                rotate: { duration: 2, ease: 'linear', repeat: Infinity },
              }}
              style={{ transformOrigin: 'center' }}
            />
          ) : (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="currentColor"
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              className={variantColors}
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
            />
          )}
        </svg>

        {/* Label */}
        {showLabel && !indeterminate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {Math.round(percentage)}%
            </span>
          </div>
        )}
      </div>
    );
  }
);

CircularProgress.displayName = 'CircularProgress';

/**
 * Progress Steps - Multi-step progress indicator
 */
export interface ProgressStepsProps {
  /** Current step (0-indexed) */
  currentStep: number;
  /** Step labels */
  steps: string[];
  /** Color variant */
  variant?: 'primary' | 'success';
}

export const ProgressSteps = forwardRef<HTMLDivElement, ProgressStepsProps>(
  ({ currentStep, steps, variant = 'primary' }, ref) => {
    const variantColors = {
      primary: {
        active: 'bg-primary-600 border-primary-600 text-white',
        completed: 'bg-primary-600 border-primary-600 text-white',
        pending: 'bg-white border-gray-300 text-gray-500',
        line: 'bg-primary-600',
      },
      success: {
        active: 'bg-success border-success text-white',
        completed: 'bg-success border-success text-white',
        pending: 'bg-white border-gray-300 text-gray-500',
        line: 'bg-success',
      },
    }[variant];

    return (
      <div ref={ref} className="w-full">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isCompleted = index < currentStep;
            const isActive = index === currentStep;
            const isPending = index > currentStep;

            return (
              <div key={index} className="flex items-center flex-1">
                {/* Step circle */}
                <div className="relative flex flex-col items-center">
                  <motion.div
                    className={cn(
                      'w-10 h-10 rounded-full border-2 flex items-center justify-center font-semibold text-sm z-10',
                      isCompleted && variantColors.completed,
                      isActive && variantColors.active,
                      isPending && variantColors.pending
                    )}
                    initial={false}
                    animate={{
                      scale: isActive ? 1.1 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                  >
                    {isCompleted ? (
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </motion.div>
                  <span className="mt-2 text-xs font-medium text-gray-700 dark:text-gray-300 text-center max-w-[100px]">
                    {step}
                  </span>
                </div>

                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 h-0.5 bg-gray-300 dark:bg-gray-600 mx-2 relative">
                    <motion.div
                      className={cn('absolute inset-0', variantColors.line)}
                      initial={{ width: 0 }}
                      animate={{ width: index < currentStep ? '100%' : '0%' }}
                      transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

ProgressSteps.displayName = 'ProgressSteps';
