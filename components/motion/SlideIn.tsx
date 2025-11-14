import { motion, HTMLMotionProps } from 'framer-motion';
import {
  slideInFromRight,
  slideInFromLeft,
  slideInFromTop,
  slideInFromBottom,
} from '@/lib/animations/variants';
import { useReducedMotion } from '@/lib/animations/hooks';

interface SlideInProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'top' | 'bottom';
  delay?: number;
  duration?: number;
}

/**
 * SlideIn Component
 *
 * Wrapper component that slides in its children from a specified direction.
 *
 * @example
 * <SlideIn direction="right">
 *   <YourContent />
 * </SlideIn>
 */
export default function SlideIn({
  children,
  direction = 'right',
  delay = 0,
  duration,
  ...props
}: SlideInProps) {
  const prefersReducedMotion = useReducedMotion();

  // Select variant based on direction
  const getVariant = () => {
    switch (direction) {
      case 'left':
        return slideInFromLeft;
      case 'right':
        return slideInFromRight;
      case 'top':
        return slideInFromTop;
      case 'bottom':
        return slideInFromBottom;
      default:
        return slideInFromRight;
    }
  };

  // If reduced motion is preferred, render without animation
  if (prefersReducedMotion) {
    return <div {...props}>{children}</div>;
  }

  const variant = getVariant();

  // Override duration if provided
  const customVariant = duration
    ? {
        ...variant,
        visible: {
          ...variant.visible,
          transition: { ...variant.visible.transition, duration },
        },
      }
    : variant;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={customVariant}
      transition={{ delay }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
