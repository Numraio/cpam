import { motion, HTMLMotionProps } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations/variants';
import { useReducedMotion } from '@/lib/animations/hooks';
import { stagger as staggerConfig } from '@/lib/animations/config';

interface StaggerProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode;
  staggerDelay?: number;
  delayChildren?: number;
}

/**
 * Stagger Component
 *
 * Container component that staggers the animation of its children.
 * Each direct child will animate in sequence with a delay.
 *
 * @example
 * <Stagger>
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 *   <div>Item 3</div>
 * </Stagger>
 */
export function Stagger({
  children,
  staggerDelay = staggerConfig.normal,
  delayChildren = 0.1,
  ...props
}: StaggerProps) {
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion is preferred, render without animation
  if (prefersReducedMotion) {
    return <div {...props}>{children}</div>;
  }

  // Custom variant with provided delays
  const customVariant = {
    ...staggerContainer,
    visible: {
      ...staggerContainer.visible,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={customVariant}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface StaggerItemProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  children: React.ReactNode;
}

/**
 * StaggerItem Component
 *
 * Item component to be used inside Stagger container.
 * Will animate in sequence with siblings.
 *
 * @example
 * <Stagger>
 *   <StaggerItem>Item 1</StaggerItem>
 *   <StaggerItem>Item 2</StaggerItem>
 * </Stagger>
 */
export function StaggerItem({ children, ...props }: StaggerItemProps) {
  const prefersReducedMotion = useReducedMotion();

  // If reduced motion is preferred, render without animation
  if (prefersReducedMotion) {
    return <div {...props}>{children}</div>;
  }

  return (
    <motion.div variants={staggerItem} {...props}>
      {children}
    </motion.div>
  );
}
