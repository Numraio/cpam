# Animation System Documentation

CPAM uses [Framer Motion](https://www.framer.com/motion/) for fluid, purposeful animations throughout the application. This document describes the animation system architecture, usage patterns, and best practices.

## Overview

The animation system consists of four layers:

1. **Foundation Layer** (`lib/animations/`): Core animation primitives
2. **Motion Components** (`components/motion/`): Reusable animation wrappers
3. **UI Components** (`components/ui/`): Components with built-in animations
4. **Chart Animations**: Recharts-based data visualization animations

## Foundation Layer

### Animation Variants (`lib/animations/variants.ts`)

Pre-defined animation configurations for consistency across the app.

**Available Variants:**

```typescript
// Fade animations
fadeIn       // Simple fade in
fadeInUp     // Fade in + slide up 20px
fadeInDown   // Fade in + slide down 20px

// Slide animations
slideInLeft  // Slide from left
slideInRight // Slide from right
slideInUp    // Slide from bottom
slideInDown  // Slide from top

// Scale animations
scaleIn      // Scale from 95% with spring physics
scaleInCenter // Scale from center (modals)

// Special effects
staggerContainer // Container for staggered children
shimmer      // Shimmer loading effect

// Modal animations
modalBackdrop // Backdrop fade
modalContent  // Modal scale + fade
```

**Usage Example:**

```tsx
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';

<motion.div variants={staggerContainer} initial="hidden" animate="visible">
  {items.map(item => (
    <motion.div key={item.id} variants={fadeInUp}>
      <ItemCard item={item} />
    </motion.div>
  ))}
</motion.div>
```

### Animation Config (`lib/animations/config.ts`)

Centralized timing and easing constants for consistent motion design.

**Durations:**
```typescript
duration.instant  = 0ms
duration.fast     = 100ms
duration.normal   = 200ms
duration.moderate = 300ms
duration.slow     = 400ms
duration.slower   = 500ms
```

**Easing Curves:**
```typescript
easing.standard    // [0.4, 0, 0.2, 1] - Standard material easing
easing.emphasized  // [0.2, 0, 0, 1]   - Emphasized enter
easing.decelerated // [0, 0, 0.2, 1]   // Decelerated exit
easing.accelerated // [0.4, 0, 1, 1]   - Accelerated enter
```

**Spring Physics:**
```typescript
spring.gentle   // Soft, gentle springs
spring.standard // Standard spring feel
spring.bouncy   // More pronounced bounce
```

**Usage Example:**

```tsx
import { duration, easing } from '@/lib/animations/config';

<motion.div
  animate={{ opacity: 1, y: 0 }}
  transition={{
    duration: duration.normal / 1000, // Convert to seconds
    ease: easing.standard
  }}
/>
```

### Animation Hooks (`lib/animations/hooks.ts`)

Accessibility hooks for animation control.

**`useReducedMotion()`**

Detects user's `prefers-reduced-motion` setting.

```tsx
import { useReducedMotion } from '@/lib/animations/hooks';

function MyComponent() {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Instant transitions instead of animations
    return <div className="opacity-100">{content}</div>;
  }

  return <motion.div variants={fadeIn}>{content}</motion.div>;
}
```

## Motion Components

### FadeIn Component

Wrapper for fade-in animations with optional directional slide.

```tsx
import { FadeIn } from '@/components/motion';

// Simple fade in
<FadeIn>
  <Content />
</FadeIn>

// Fade in with slide up
<FadeIn direction="up">
  <Content />
</FadeIn>

// With custom delay
<FadeIn delay={0.2}>
  <Content />
</FadeIn>
```

**Props:**
- `direction?: 'up' | 'down' | 'left' | 'right'` - Slide direction
- `delay?: number` - Animation delay in seconds
- `duration?: number` - Animation duration in seconds

### SlideIn Component

Wrapper for slide-in animations from any direction.

```tsx
import { SlideIn } from '@/components/motion';

<SlideIn direction="left">
  <Sidebar />
</SlideIn>
```

**Props:**
- `direction: 'up' | 'down' | 'left' | 'right'` - Slide direction (required)
- `distance?: number` - Slide distance in pixels (default: 20)
- `delay?: number` - Animation delay in seconds

### Stagger Component

Container for staggered list animations.

```tsx
import { Stagger, StaggerItem } from '@/components/motion';

<Stagger staggerDelay={0.05}>
  {items.map(item => (
    <StaggerItem key={item.id}>
      <ItemCard item={item} />
    </StaggerItem>
  ))}
</Stagger>
```

**Props:**
- `staggerDelay?: number` - Delay between items in seconds (default: 0.05)
- `initialDelay?: number` - Initial delay before first item

### PageTransition Component

Global page transition wrapper (already integrated in `_app.tsx`).

```tsx
// In pages/_app.tsx
<PageTransition mode="fade">
  {getLayout(<Component {...props} />)}
</PageTransition>
```

**Modes:**
- `fade` - Simple cross-fade (default)
- `slide` - Slide left/right based on direction
- `scale` - Scale down old page, scale up new page

## UI Component Animations

### Button Animations

Buttons have built-in hover and tap animations with spring physics.

```tsx
<Button variant="primary">
  Click Me
</Button>
// Automatically animates:
// - Hover: scale(1.02)
// - Tap: scale(0.98)
// - Spring physics for natural feel
```

### Card Animations

Interactive cards lift on hover.

```tsx
<Card interactive onClick={handleClick}>
  <CardBody>Content</CardBody>
</Card>
// Animates:
// - Hover: scale(1.01) + translateY(-4px)
// - Shadow increases
```

### Modal Animations

Modals enter with backdrop fade + content scale.

```tsx
<Modal isOpen={isOpen} onClose={onClose}>
  <ModalContent />
</Modal>
// Animates:
// - Backdrop: opacity 0 → 0.5
// - Content: scale 0.95 → 1, opacity 0 → 1
```

## Loading State Animations

### Skeleton Loaders

Animated skeleton placeholders with shimmer effect.

```tsx
import { Skeleton, SkeletonCard, SkeletonTable } from '@/components/ui/Skeleton';

// Basic skeleton
<Skeleton variant="text" width="200px" height="20px" />

// Skeleton card (avatar + title + description)
<SkeletonCard hasAvatar lines={3} hasActions />

// Skeleton table
<SkeletonTable rows={5} columns={4} />
```

**Features:**
- Shimmer gradient animation (1.5s loop)
- Dark mode support
- Can disable animation with `noAnimation` prop

### Spinners

Multiple spinner variants for different contexts.

```tsx
import { Spinner, SpinnerOverlay } from '@/components/ui/Spinner';

// Circular spinner
<Spinner variant="circular" size="md" color="primary" />

// Dots spinner
<Spinner variant="dots" size="sm" />

// Full-screen overlay
<SpinnerOverlay message="Loading..." />
```

**Variants:**
- `circular` - Rotating circle (default)
- `dots` - Three bouncing dots
- `pulse` - Pulsing circle
- `bars` - Scaling bars

### Progress Indicators

Animated progress bars and circular progress.

```tsx
import { Progress, CircularProgress, ProgressSteps } from '@/components/ui/Progress';

// Linear progress
<Progress value={75} showLabel striped animated />

// Circular progress
<CircularProgress value={60} size="lg" showLabel />

// Multi-step progress
<ProgressSteps
  steps={['Upload', 'Process', 'Complete']}
  currentStep={1}
/>
```

## Chart Animations

All Recharts-based charts have smooth enter animations enabled by default.

```tsx
import { LineChart, BarChart, AreaChart, PieChart } from '@/components/ui/charts';

// Animated by default
<LineChart
  data={data}
  lines={[{ dataKey: 'value', name: 'Sales', color: '#3b82f6' }]}
  xAxisKey="date"
/>

// Disable animations
<BarChart
  data={data}
  bars={[{ dataKey: 'value', name: 'Revenue' }]}
  xAxisKey="month"
  animate={false}
/>
```

**Animation Features:**
- **Stagger effect**: Multiple series animate with 100ms delay each
- **Duration**: 800ms for professional feel
- **Easing**: ease-in-out (smooth acceleration/deceleration)
- **Performance**: GPU-accelerated SVG animations (60fps)

**Chart Types:**
- `LineChart` - Staggered line drawing
- `BarChart` - Staggered bar rise
- `AreaChart` - Staggered area fill
- `PieChart` - Smooth pie segment draw

## Best Practices

### 1. Use GPU-Accelerated Properties

Prefer animating `transform` and `opacity` over other properties.

✅ **Good** (GPU-accelerated):
```tsx
<motion.div
  animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
/>
```

❌ **Avoid** (causes layout recalculation):
```tsx
<motion.div
  animate={{ width: 200, height: 100, top: 50 }}
/>
```

### 2. Respect Reduced Motion

Always check `useReducedMotion()` for accessibility.

```tsx
const prefersReducedMotion = useReducedMotion();

<motion.div
  animate={{ opacity: 1 }}
  transition={{
    duration: prefersReducedMotion ? 0 : 0.3
  }}
/>
```

### 3. Use Appropriate Durations

Follow the timing guidelines:
- **Micro-interactions**: 100-200ms (fast, snappy)
- **Transitions**: 200-300ms (standard)
- **Complex animations**: 300-500ms (slower, more noticeable)

### 4. Stagger Children Wisely

Don't overdo stagger delays. Keep them subtle.

✅ **Good**:
```tsx
staggerChildren: 0.05 // 50ms delay
```

❌ **Too slow**:
```tsx
staggerChildren: 0.3 // 300ms delay - feels sluggish
```

### 5. Use Spring Physics for Interactive Elements

Buttons, cards, and other interactive elements feel more natural with spring physics.

```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
/>
```

### 6. Exit Animations

Always provide exit animations for removed elements.

```tsx
<AnimatePresence>
  {isVisible && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

### 7. Layout Animations

Use `layout` prop for smooth layout shifts.

```tsx
<motion.div layout>
  {/* Content that may change size */}
</motion.div>
```

## Performance Considerations

### Animation Budget

Target: **< 50ms per frame** (60fps = 16.67ms per frame with buffer)

### Performance Tips

1. **Limit concurrent animations**: Don't animate 100 items at once
2. **Use `will-change` sparingly**: Only for elements currently animating
3. **Avoid layout thrashing**: Batch DOM reads/writes
4. **Use `layoutId` for shared elements**: More efficient than separate animations
5. **Disable animations on low-end devices**: Check device capabilities

### Monitoring Performance

Use Chrome DevTools Performance tab:
1. Record while triggering animations
2. Look for dropped frames (> 16.67ms)
3. Check for layout recalculation
4. Verify GPU compositing

## Troubleshooting

### Animation not working

**Check**:
- Is `prefers-reduced-motion` enabled?
- Is `initial` state defined?
- Is component wrapped in `<AnimatePresence>` (for exit animations)?
- Are you animating GPU-accelerated properties?

### Animation feels sluggish

**Solutions**:
- Reduce `staggerChildren` delay
- Decrease animation `duration`
- Use `ease: 'linear'` instead of complex easing
- Check for layout recalculation in DevTools

### Animation causes layout shift

**Solutions**:
- Use `transform` instead of width/height
- Add explicit dimensions to container
- Use `layout` prop for automatic layout animations
- Avoid animating `padding` or `margin`

## Examples

### Complete Page Animation

```tsx
import { motion } from 'framer-motion';
import { fadeInUp, staggerContainer } from '@/lib/animations/variants';

export default function Page() {
  return (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h1 variants={fadeInUp}>
        Page Title
      </motion.h1>

      <motion.div variants={fadeInUp}>
        <Card>Content</Card>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <DataGrid />
      </motion.div>
    </motion.div>
  );
}
```

### Modal with Backdrop

```tsx
import { motion, AnimatePresence } from 'framer-motion';
import { modalBackdrop, modalContent } from '@/lib/animations/variants';

function Modal({ isOpen, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            variants={modalBackdrop}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="fixed inset-0 bg-black/50"
          />
          <motion.div
            variants={modalContent}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 flex items-center justify-center"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Loading State Transition

```tsx
import { AnimatePresence } from 'framer-motion';
import { FadeIn } from '@/components/motion';
import { SkeletonCard } from '@/components/ui/Skeleton';

function DataView({ data, isLoading }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading ? (
        <FadeIn key="loading">
          <SkeletonCard lines={3} />
        </FadeIn>
      ) : (
        <FadeIn key="content">
          <DataCard data={data} />
        </FadeIn>
      )}
    </AnimatePresence>
  );
}
```

## Resources

- [Framer Motion Documentation](https://www.framer.com/motion/)
- [Material Design Motion Guidelines](https://m3.material.io/styles/motion/overview)
- [Linear's Animation System](https://linear.app/blog/how-we-design-our-animations)
- [Web Animation Performance](https://web.dev/animations-guide/)

## Summary

The CPAM animation system provides:

✅ **Consistent motion design** across all components
✅ **Accessibility-first** with reduced motion support
✅ **Performance-optimized** GPU-accelerated animations
✅ **Easy to use** with pre-built variants and components
✅ **Flexible** for custom animations when needed
✅ **Well-documented** with examples and best practices

Follow these guidelines to create smooth, purposeful animations that enhance the user experience without sacrificing performance or accessibility.
