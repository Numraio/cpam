/**
 * Design Tokens
 *
 * Central source of truth for all design values in the application.
 * Inspired by Material Design 3 and modern design systems.
 */

export const designTokens = {
  /**
   * Color Palette
   * Using HSL for better manipulation and theming
   */
  colors: {
    // Primary Brand Color (Blue)
    primary: {
      50: 'hsl(214, 100%, 97%)',
      100: 'hsl(214, 95%, 93%)',
      200: 'hsl(213, 97%, 87%)',
      300: 'hsl(212, 96%, 78%)',
      400: 'hsl(213, 94%, 68%)',
      500: 'hsl(217, 91%, 60%)', // Main primary
      600: 'hsl(221, 83%, 53%)',
      700: 'hsl(224, 76%, 48%)',
      800: 'hsl(226, 71%, 40%)',
      900: 'hsl(224, 64%, 33%)',
      950: 'hsl(226, 56%, 22%)',
    },

    // Semantic Colors
    success: {
      light: 'hsl(142, 76%, 96%)',
      DEFAULT: 'hsl(142, 71%, 45%)',
      dark: 'hsl(142, 76%, 36%)',
    },
    warning: {
      light: 'hsl(48, 100%, 96%)',
      DEFAULT: 'hsl(48, 96%, 53%)',
      dark: 'hsl(32, 95%, 44%)',
    },
    error: {
      light: 'hsl(0, 86%, 97%)',
      DEFAULT: 'hsl(0, 84%, 60%)',
      dark: 'hsl(0, 72%, 51%)',
    },
    info: {
      light: 'hsl(199, 89%, 96%)',
      DEFAULT: 'hsl(199, 89%, 48%)',
      dark: 'hsl(199, 80%, 40%)',
    },

    // Neutral Gray Scale
    gray: {
      50: 'hsl(210, 20%, 98%)',
      100: 'hsl(220, 14%, 96%)',
      200: 'hsl(220, 13%, 91%)',
      300: 'hsl(216, 12%, 84%)',
      400: 'hsl(218, 11%, 65%)',
      500: 'hsl(220, 9%, 46%)',
      600: 'hsl(215, 14%, 34%)',
      700: 'hsl(217, 19%, 27%)',
      800: 'hsl(215, 28%, 17%)',
      900: 'hsl(221, 39%, 11%)',
      950: 'hsl(224, 71%, 4%)',
    },

    // Surface Colors (for dark mode)
    surface: {
      base: 'hsl(0, 0%, 100%)',
      elevated: 'hsl(0, 0%, 100%)',
      dark: {
        base: 'hsl(222, 47%, 11%)',
        elevated: 'hsl(217, 33%, 17%)',
        overlay: 'hsl(215, 28%, 24%)',
      },
    },
  },

  /**
   * Typography Scale
   * Based on 16px base with modular scale
   */
  typography: {
    fontFamily: {
      sans: ['Inter', 'system-ui', 'sans-serif'],
      mono: ['JetBrains Mono', 'Courier New', 'monospace'],
    },
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }], // 12px
      sm: ['0.875rem', { lineHeight: '1.25rem' }], // 14px
      base: ['1rem', { lineHeight: '1.5rem' }], // 16px
      lg: ['1.125rem', { lineHeight: '1.75rem' }], // 18px
      xl: ['1.25rem', { lineHeight: '1.75rem' }], // 20px
      '2xl': ['1.5rem', { lineHeight: '2rem' }], // 24px
      '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
      '4xl': ['2.25rem', { lineHeight: '2.5rem' }], // 36px
      '5xl': ['3rem', { lineHeight: '1' }], // 48px
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    letterSpacing: {
      tight: '-0.02em',
      normal: '0',
      wide: '0.02em',
    },
  },

  /**
   * Spacing Scale
   * Based on 4px base unit
   */
  spacing: {
    0: '0',
    1: '0.25rem', // 4px
    2: '0.5rem', // 8px
    3: '0.75rem', // 12px
    4: '1rem', // 16px
    5: '1.25rem', // 20px
    6: '1.5rem', // 24px
    8: '2rem', // 32px
    10: '2.5rem', // 40px
    12: '3rem', // 48px
    16: '4rem', // 64px
    20: '5rem', // 80px
    24: '6rem', // 96px
  },

  /**
   * Border Radius
   */
  borderRadius: {
    none: '0',
    sm: '0.25rem', // 4px
    DEFAULT: '0.5rem', // 8px (Material Design 3 standard)
    md: '0.75rem', // 12px
    lg: '1rem', // 16px
    xl: '1.5rem', // 24px
    '2xl': '2rem', // 32px
    full: '9999px',
  },

  /**
   * Elevation / Shadows
   * Material Design 3 inspired
   */
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)',
  },

  /**
   * Animation / Transition Durations
   * Based on Material Design motion guidelines
   */
  animation: {
    duration: {
      instant: '50ms',
      fast: '100ms',
      normal: '200ms',
      slow: '300ms',
      slower: '500ms',
    },
    easing: {
      // Material Design standard easing
      standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      // Emphasized easing for important transitions
      emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      // Deceleration easing (enter)
      decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      // Acceleration easing (exit)
      accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },

  /**
   * Z-Index Scale
   */
  zIndex: {
    dropdown: 1000,
    sticky: 1100,
    fixed: 1200,
    modalBackdrop: 1300,
    modal: 1400,
    popover: 1500,
    tooltip: 1600,
  },

  /**
   * Breakpoints
   * Mobile-first responsive design
   */
  breakpoints: {
    xs: '320px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
} as const;

export type DesignTokens = typeof designTokens;
