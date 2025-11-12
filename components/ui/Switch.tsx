import { forwardRef } from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils/cn';

/**
 * Switch Component
 *
 * Modern toggle switch built with Radix UI Switch.
 * Features smooth animations and accessible keyboard controls.
 */

export interface SwitchProps
  extends Omit<SwitchPrimitive.SwitchProps, 'asChild'> {
  /** Label for the switch */
  label?: string;
  /** Description text */
  description?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: {
    root: 'h-5 w-9',
    thumb: 'h-4 w-4 data-[state=checked]:translate-x-4',
  },
  md: {
    root: 'h-6 w-11',
    thumb: 'h-5 w-5 data-[state=checked]:translate-x-5',
  },
  lg: {
    root: 'h-7 w-14',
    thumb: 'h-6 w-6 data-[state=checked]:translate-x-7',
  },
};

/**
 * Switch component
 *
 * @example
 * ```tsx
 * <Switch
 *   checked={enabled}
 *   onCheckedChange={setEnabled}
 *   label="Enable notifications"
 *   description="Receive email notifications for updates"
 * />
 * ```
 */
export const Switch = forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  SwitchProps
>(({ className, label, description, size = 'md', id, ...props }, ref) => {
  const sizes = sizeClasses[size];

  const switchElement = (
    <SwitchPrimitive.Root
      ref={ref}
      id={id}
      className={cn(
        'peer inline-flex shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-normal',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary-600 data-[state=unchecked]:bg-gray-200',
        sizes.root,
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'pointer-events-none block rounded-full bg-white shadow-sm ring-0 transition-transform duration-normal',
          sizes.thumb
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (!label && !description) {
    return switchElement;
  }

  return (
    <div className="flex items-start gap-3">
      {switchElement}
      {(label || description) && (
        <div className="flex-1">
          {label && (
            <label
              htmlFor={id}
              className="text-sm font-medium text-gray-900 cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-0.5">{description}</p>
          )}
        </div>
      )}
    </div>
  );
});

Switch.displayName = 'Switch';

/**
 * Switch Group - Multiple switches with a common label
 */
export interface SwitchGroupProps {
  /** Group label */
  label?: string;
  /** Group description */
  description?: string;
  /** Children switches */
  children: React.ReactNode;
}

export const SwitchGroup = ({
  label,
  description,
  children,
}: SwitchGroupProps) => {
  return (
    <div className="space-y-4">
      {(label || description) && (
        <div>
          {label && (
            <h3 className="text-sm font-medium text-gray-900">{label}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">{children}</div>
    </div>
  );
};

SwitchGroup.displayName = 'SwitchGroup';
