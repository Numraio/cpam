/**
 * Animation Configuration
 *
 * Centralized animation constants for consistent timing and easing across the app.
 * Based on Google Material Design 3 motion guidelines.
 */

// Duration constants (in seconds)
export const duration = {
  instant: 0,
  fast: 0.1,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.4,
  slower: 0.5,
} as const;

// Easing functions
export const easing = {
  // Standard easing - used for most animations
  standard: [0.4, 0, 0.2, 1] as const,

  // Emphasized easing - used for important transitions
  emphasized: [0.2, 0, 0, 1] as const,

  // Decelerated easing - used for enter animations
  decelerated: [0, 0, 0.2, 1] as const,

  // Accelerated easing - used for exit animations
  accelerated: [0.4, 0, 1, 1] as const,

  // Linear - used for continuous animations
  linear: [0, 0, 1, 1] as const,
} as const;

// Spring configurations
export const spring = {
  // Gentle spring - for smooth, subtle animations
  gentle: {
    type: 'spring' as const,
    stiffness: 200,
    damping: 25,
  },

  // Standard spring - for most interactive elements
  standard: {
    type: 'spring' as const,
    stiffness: 300,
    damping: 30,
  },

  // Bouncy spring - for playful interactions
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 25,
  },

  // Snappy spring - for quick, responsive interactions
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 35,
  },
} as const;

// Stagger timing
export const stagger = {
  fast: 0.03,
  normal: 0.05,
  slow: 0.1,
} as const;

// Delay timing
export const delay = {
  none: 0,
  short: 0.1,
  medium: 0.2,
  long: 0.3,
} as const;

// Animation performance optimization
export const performance = {
  // Properties to use will-change for (sparingly)
  willChangeTransform: { willChange: 'transform' },
  willChangeOpacity: { willChange: 'opacity' },
  willChangeAuto: { willChange: 'auto' },

  // Hardware acceleration hint
  gpuAcceleration: { transform: 'translateZ(0)' },
} as const;

// Reduced motion configuration
export const reducedMotion = {
  // Instant transitions for reduced motion preference
  instant: {
    duration: 0,
    ease: 'linear' as const,
  },

  // Very fast transitions as fallback
  fast: {
    duration: 0.1,
    ease: easing.standard,
  },
} as const;

// Common transition configurations
export const transition = {
  // Default transition for most elements
  default: {
    duration: duration.normal,
    ease: easing.standard,
  },

  // Fast transition for micro-interactions
  fast: {
    duration: duration.fast,
    ease: easing.standard,
  },

  // Moderate transition for larger elements
  moderate: {
    duration: duration.moderate,
    ease: easing.standard,
  },

  // Exit transition (slightly faster)
  exit: {
    duration: duration.fast,
    ease: easing.accelerated,
  },

  // Enter transition (slightly slower)
  enter: {
    duration: duration.moderate,
    ease: easing.decelerated,
  },
} as const;
