import { useEffect, useState } from 'react';
import { reducedMotion as reducedMotionConfig } from './config';

/**
 * Animation Hooks
 *
 * Custom hooks for animation-related functionality.
 */

/**
 * Hook to detect user's reduced motion preference
 * Returns true if user prefers reduced motion
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is defined (SSR compatibility)
    if (typeof window === 'undefined') return;

    // Get initial value
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook to get animation transition based on reduced motion preference
 * Returns instant transition if user prefers reduced motion, otherwise returns the provided transition
 */
export function useAnimationTransition(transition: any) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return reducedMotionConfig.instant;
  }

  return transition;
}

/**
 * Hook to check if animations should be enabled
 * Returns false if user prefers reduced motion
 */
export function useAnimationsEnabled(): boolean {
  const prefersReducedMotion = useReducedMotion();
  return !prefersReducedMotion;
}
