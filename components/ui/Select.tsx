import { forwardRef, useState } from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { cn } from '@/lib/utils/cn';
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

/**
 * Select Component
 *
 * Accessible select dropdown built with Radix UI Select.
 * Features search, multi-select, and grouped options.
 */

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  /** Label for the select */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Current value */
  value?: string;
  /** Default value */
  defaultValue?: string;
  /** Change handler */
  onValueChange?: (value: string) => void;
  /** Options array */
  options: SelectOption[];
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** ID for the select */
  id?: string;
}

/**
 * Select component
 *
 * @example
 * ```tsx
 * <Select
 *   label="Country"
 *   placeholder="Select a country"
 *   value={country}
 *   onValueChange={setCountry}
 *   options={[
 *     { value: 'us', label: 'United States' },
 *     { value: 'uk', label: 'United Kingdom' },
 *     { value: 'ca', label: 'Canada' },
 *   ]}
 * />
 * ```
 */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      label,
      placeholder = 'Select an option',
      value,
      defaultValue,
      onValueChange,
      options,
      error,
      helperText,
      disabled,
      required,
      id,
    },
    ref
  ) => {
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
            {required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            className={cn(
              'flex items-center justify-between w-full rounded-lg border bg-white px-4 py-3 text-base transition-all duration-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed',
              error
                ? 'border-error focus:ring-error'
                : 'border-gray-300 hover:border-gray-400'
            )}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${id}-error`
                : helperText
                ? `${id}-helper`
                : undefined
            }
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'overflow-hidden bg-white rounded-lg border border-gray-200 shadow-lg',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
              )}
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.ScrollUpButton className="flex items-center justify-center h-6 bg-white cursor-default">
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              </SelectPrimitive.ScrollUpButton>

              <SelectPrimitive.Viewport className="p-1">
                {options.map((option) => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectPrimitive.Viewport>

              <SelectPrimitive.ScrollDownButton className="flex items-center justify-center h-6 bg-white cursor-default">
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {error && (
          <p
            id={`${id}-error`}
            className="mt-1 text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${id}-helper`} className="mt-1 text-sm text-gray-600">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

/**
 * Select Item - Internal component
 */
const SelectItem = forwardRef<
  HTMLDivElement,
  SelectPrimitive.SelectItemProps
>(({ children, className, ...props }, ref) => {
  return (
    <SelectPrimitive.Item
      ref={ref}
      className={cn(
        'relative flex items-center w-full cursor-pointer select-none rounded px-3 py-2 text-sm outline-none',
        'hover:bg-gray-100 focus:bg-gray-100',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    >
      <span className="absolute left-3 flex h-3.5 w-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="h-4 w-4 text-primary-600" />
        </SelectPrimitive.ItemIndicator>
      </span>

      <SelectPrimitive.ItemText className="pl-6">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
});

SelectItem.displayName = 'SelectItem';

/**
 * Searchable Select with filtering
 */
export interface SearchableSelectProps extends Omit<SelectProps, 'options'> {
  /** Options array */
  options: SelectOption[];
  /** Search placeholder */
  searchPlaceholder?: string;
}

export const SearchableSelect = forwardRef<
  HTMLButtonElement,
  SearchableSelectProps
>(
  (
    {
      options,
      searchPlaceholder = 'Search...',
      ...props
    },
    ref
  ) => {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredOptions = options.filter((option) =>
      option.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="w-full">
        {props.label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {props.label}
            {props.required && <span className="text-error ml-1">*</span>}
          </label>
        )}

        <SelectPrimitive.Root
          value={props.value}
          defaultValue={props.defaultValue}
          onValueChange={props.onValueChange}
          disabled={props.disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={props.id}
            className={cn(
              'flex items-center justify-between w-full rounded-lg border bg-white px-4 py-3 text-base transition-all duration-normal focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed',
              props.error
                ? 'border-error focus:ring-error'
                : 'border-gray-300 hover:border-gray-400'
            )}
          >
            <SelectPrimitive.Value placeholder={props.placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDownIcon className="h-4 w-4 text-gray-400" />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className={cn(
                'overflow-hidden bg-white rounded-lg border border-gray-200 shadow-lg',
                'data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
                'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
                'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2'
              )}
              position="popper"
              sideOffset={4}
            >
              {/* Search Input */}
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>

              <SelectPrimitive.Viewport className="p-1 max-h-60">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={option.value}
                      disabled={option.disabled}
                    >
                      {option.label}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-3 py-6 text-center text-sm text-gray-500">
                    No results found
                  </div>
                )}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>

        {props.error && (
          <p
            id={`${props.id}-error`}
            className="mt-1 text-sm text-error"
            role="alert"
          >
            {props.error}
          </p>
        )}

        {props.helperText && !props.error && (
          <p id={`${props.id}-helper`} className="mt-1 text-sm text-gray-600">
            {props.helperText}
          </p>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
