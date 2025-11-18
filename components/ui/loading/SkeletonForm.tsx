import { Shimmer } from './Shimmer';

interface SkeletonFormProps {
  /** Number of form fields to display (default: 4) */
  fields?: number;
  /** Show form actions/buttons (default: true) */
  showActions?: boolean;
}

/**
 * Skeleton Form Component
 *
 * Loading state for form components with input field placeholders.
 * Displays animated skeleton fields while form schema is being loaded.
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <SkeletonForm fields={6} />
 * ) : (
 *   <Form schema={formSchema} />
 * )}
 * ```
 */
export function SkeletonForm({ fields = 4, showActions = true }: SkeletonFormProps) {
  return (
    <div className="space-y-6">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index} className="animate-pulse">
          {/* Label */}
          <div className="relative h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden mb-2">
            <Shimmer />
          </div>
          {/* Input field */}
          <div className="relative h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <Shimmer />
          </div>
        </div>
      ))}

      {showActions && (
        <div className="flex gap-3 pt-4">
          <div className="relative h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <Shimmer />
          </div>
          <div className="relative h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
            <Shimmer />
          </div>
        </div>
      )}
    </div>
  );
}
