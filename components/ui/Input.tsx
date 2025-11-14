import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/cn';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

/**
 * Input Component
 *
 * Modern text input with floating label, validation states, and icons.
 * Inspired by Material Design 3 and Google forms.
 */

const inputVariants = cva(
  // Base styles
  'w-full rounded-lg border bg-white px-4 pt-6 pb-2 text-base transition-all duration-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed',
  {
    variants: {
      state: {
        default: 'border-gray-300 hover:border-gray-400',
        error: 'border-error focus:ring-error',
        success: 'border-success focus:ring-success',
      },
    },
    defaultVariants: {
      state: 'default',
    },
  }
);

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text (floating) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Helper text below input */
  helperText?: string;
  /** Icon on the right side */
  rightIcon?: React.ReactNode;
}

/**
 * Input component with floating label
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   type="email"
 *   value={email}
 *   onChange={(e) => setEmail(e.target.value)}
 *   error="Invalid email address"
 * />
 *
 * <Input
 *   label="Password"
 *   type="password"
 *   success="Strong password!"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      rightIcon,
      value,
      defaultValue,
      type = 'text',
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined ? String(value).length > 0 : (defaultValue !== undefined && String(defaultValue).length > 0);
    const isFloating = isFocused || hasValue;

    // Determine state
    let state: 'default' | 'error' | 'success' = 'default';
    if (error) state = 'error';
    else if (success) state = 'success';

    return (
      <div className="w-full">
        <motion.div
          className="relative"
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <input
            ref={ref}
            type={type}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            className={cn(
              inputVariants({ state }),
              rightIcon && 'pr-11',
              className
            )}
            placeholder=" " // Required for floating label CSS
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : success ? `${props.id}-success` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {/* Floating Label */}
          <label
            htmlFor={props.id}
            className={cn(
              'absolute left-4 transition-all duration-normal pointer-events-none',
              isFloating
                ? 'top-2 text-xs text-gray-600'
                : 'top-4 text-base text-gray-400',
              disabled && 'text-gray-400'
            )}
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>

          {/* Right Icon or Validation Icon */}
          {rightIcon && !error && !success && (
            <div className="absolute right-3 top-4 text-gray-400">
              {rightIcon}
            </div>
          )}
          {error && (
            <div className="absolute right-3 top-4 text-error">
              <XCircleIcon className="h-5 w-5" />
            </div>
          )}
          {success && !error && (
            <div className="absolute right-3 top-4 text-success">
              <CheckCircleIcon className="h-5 w-5" />
            </div>
          )}
        </motion.div>

        {/* Error Message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-sm text-error flex items-center gap-1"
            role="alert"
          >
            <XCircleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={`${props.id}-success`}
            className="mt-1 text-sm text-success flex items-center gap-1"
          >
            <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            {success}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && !success && (
          <p
            id={`${props.id}-helper`}
            className="mt-1 text-sm text-gray-600"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Textarea component with floating label
 */
export interface TextareaProps
  extends Omit<InputHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  /** Label text (floating) */
  label: string;
  /** Error message to display */
  error?: string;
  /** Success message to display */
  success?: string;
  /** Helper text below input */
  helperText?: string;
  /** Show character count */
  maxLength?: number;
  /** Number of rows */
  rows?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      success,
      helperText,
      value,
      defaultValue,
      maxLength,
      rows = 4,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const hasValue = value !== undefined ? String(value).length > 0 : (defaultValue !== undefined && String(defaultValue).length > 0);
    const isFloating = isFocused || hasValue;

    const currentLength = value ? String(value).length : 0;

    // Determine state
    let state: 'default' | 'error' | 'success' = 'default';
    if (error) state = 'error';
    else if (success) state = 'success';

    return (
      <div className="w-full">
        <motion.div
          className="relative"
          animate={{ scale: isFocused ? 1.01 : 1 }}
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <textarea
            ref={ref}
            value={value}
            defaultValue={defaultValue}
            disabled={disabled}
            rows={rows}
            maxLength={maxLength}
            className={cn(
              'w-full rounded-lg border bg-white px-4 pt-6 pb-2 text-base transition-all duration-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed resize-y',
              state === 'error' && 'border-error focus:ring-error',
              state === 'success' && 'border-success focus:ring-success',
              state === 'default' && 'border-gray-300 hover:border-gray-400',
              className
            )}
            placeholder=" "
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${props.id}-error` : success ? `${props.id}-success` : helperText ? `${props.id}-helper` : undefined
            }
            {...props}
          />

          {/* Floating Label */}
          <label
            htmlFor={props.id}
            className={cn(
              'absolute left-4 transition-all duration-normal pointer-events-none',
              isFloating
                ? 'top-2 text-xs text-gray-600'
                : 'top-4 text-base text-gray-400',
              disabled && 'text-gray-400'
            )}
          >
            {label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        </motion.div>

        {/* Character Count */}
        {maxLength && (
          <div className="mt-1 text-xs text-gray-500 text-right">
            {currentLength} / {maxLength}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-sm text-error flex items-center gap-1"
            role="alert"
          >
            <XCircleIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Success Message */}
        {success && !error && (
          <p
            id={`${props.id}-success`}
            className="mt-1 text-sm text-success flex items-center gap-1"
          >
            <CheckCircleIcon className="h-4 w-4 flex-shrink-0" />
            {success}
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && !success && (
          <p
            id={`${props.id}-helper`}
            className="mt-1 text-sm text-gray-600"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
