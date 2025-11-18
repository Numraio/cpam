/**
 * Shimmer Animation Component
 *
 * Provides a subtle shimmer/wave animation effect for skeleton loading states.
 * Used as an overlay on skeleton components to indicate content is loading.
 */

export const Shimmer = () => {
  return (
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-gray-700/30 to-transparent" />
  );
};
