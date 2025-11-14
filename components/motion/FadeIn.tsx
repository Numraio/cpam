import { motion, HTMLMotionProps } from 'framer-motion';
import { fadeIn, fadeInUp, fadeInDown } from '@/lib/animations/variants';
import { useReducedMotion } from '@/lib/animations/hooks';

interface FadeInProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'none';
  delay?: number;
  duration?: number;
}

/**
 * FadeIn Component
 *
 * Wrapper component that fades in its children with optional directional slide.
 *
 * @example
 * <FadeIn direction="up">
 *   <YourContent />
 * </FadeIn>
 */
export default function FadeIn({
  children,
  direction = 'none',
  delay = 0,
  duration,
  ...props
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();

  // Select variant based on direction
  const getVariant = () => {
    switch (direction) {
      case 'up':
        return fadeInUp;
      case 'down':
        return fadeInDown;
      default:
        return fadeIn;
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
