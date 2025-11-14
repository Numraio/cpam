import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { ReactNode } from 'react';
import { useReducedMotion } from '@/lib/animations/hooks';
import { duration, easing } from '@/lib/animations/config';

interface PageTransitionProps {
  children: ReactNode;
  mode?: 'fade' | 'slide' | 'scale';
}

/**
 * PageTransition Component
 *
 * Wraps page content to provide smooth transitions between route changes.
 * Uses Next.js router to detect route changes and animate accordingly.
 *
 * @example
 * // In _app.tsx:
 * <PageTransition mode="fade">
 *   <Component {...pageProps} />
 * </PageTransition>
 */
export default function PageTransition({
  children,
  mode = 'fade',
}: PageTransitionProps) {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();

  // If user prefers reduced motion, render without animations
  if (prefersReducedMotion) {
    return <>{children}</>;
  }

  // Animation variants based on mode
  const variants = {
    fade: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: {
        duration: duration.normal,
        ease: easing.standard,
      },
    },
    slide: {
      initial: { opacity: 0, x: 20 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 0, x: -20 },
      transition: {
        duration: duration.moderate,
        ease: easing.emphasized,
      },
    },
    scale: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: {
        duration: duration.normal,
        ease: easing.standard,
      },
    },
  };

  const selectedVariant = variants[mode];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={router.pathname}
        initial={selectedVariant.initial}
        animate={selectedVariant.animate}
        exit={selectedVariant.exit}
        transition={selectedVariant.transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
