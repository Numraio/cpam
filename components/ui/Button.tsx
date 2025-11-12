import { forwardRef, ButtonHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

/**
 * Button Component
 *
 * Modern button with variants, sizes, and micro-interactions.
 * Inspired by Material Design 3 and Linear.
 */

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        // Filled button (primary action)
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
        // Outlined button (secondary action)
        secondary:
          'border-2 border-gray-300 bg-transparent text-gray-700 hover:bg-gray-50 hover:border-gray-400 active:bg-gray-100',
        // Ghost button (tertiary action)
        ghost:
          'bg-transparent text-gray-700 hover:bg-gray-100 active:bg-gray-200',
        // Destructive button (danger action)
        danger:
          'bg-error text-white hover:bg-error-dark active:bg-error-dark shadow-sm hover:shadow-md',
        // Success button
        success:
          'bg-success text-white hover:bg-success-dark active:bg-success-dark shadow-sm hover:shadow-md',
        // Link button (no background)
        link:
          'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-base',
        lg: 'h-12 px-6 text-lg',
        icon: 'h-10 w-10',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  }
);

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'>,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner */
  loading?: boolean;
  /** Icon before text */
  leftIcon?: React.ReactNode;
  /** Icon after text */
  rightIcon?: React.ReactNode;
}

/**
 * Button component with micro-interactions
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 *
 * <Button variant="secondary" loading>
 *   Loading...
 * </Button>
 *
 * <Button variant="danger" leftIcon={<TrashIcon />}>
 *   Delete
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <motion.button
        ref={ref}
        className={cn(buttonVariants({ variant, size, fullWidth, className }))}
        disabled={disabled || loading}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {!loading && leftIcon && <span className="mr-2">{leftIcon}</span>}
        {children}
        {!loading && rightIcon && <span className="ml-2">{rightIcon}</span>}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Icon Button - Circular button for icons
 */
export const IconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonProps, 'leftIcon' | 'rightIcon' | 'children'> & { icon: React.ReactNode; ariaLabel: string }
>(({ icon, ariaLabel, className, variant = 'ghost', size = 'icon', ...props }, ref) => {
  return (
    <Button
      ref={ref}
      variant={variant}
      size={size}
      className={cn('rounded-full', className)}
      aria-label={ariaLabel}
      {...props}
    >
      {icon}
    </Button>
  );
});

IconButton.displayName = 'IconButton';
