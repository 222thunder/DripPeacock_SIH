/** Shared motion tokens — strong curves, UI under 300ms, GPU transform strings. */

export const easeOut = [0.23, 1, 0.32, 1] as const;
export const easeInOut = [0.77, 0, 0.175, 1] as const;

/** Stagger between list children (30–80ms). */
export const STAGGER = 0.04;

/** Soft page/section enter — short travel, strong ease-out. */
export const fadeUp = {
  hidden: { opacity: 0, transform: 'translateY(6px)' },
  show: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.22, ease: easeOut },
  },
};

export const fadeUpReduced = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { duration: 0.15, ease: easeOut },
  },
};

export const staggerContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: STAGGER },
  },
};

/** Modal / overlay panel (centered — not trigger-anchored). */
export const modalPanel = {
  hidden: { opacity: 0, transform: 'scale(0.97)' },
  show: {
    opacity: 1,
    transform: 'scale(1)',
    transition: { duration: 0.22, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transform: 'scale(0.97)',
    transition: { duration: 0.18, ease: easeOut },
  },
};

/** Step / view swap — exit slightly faster than enter. */
export const viewSwap = {
  initial: { opacity: 0, transform: 'translateY(8px)' },
  animate: {
    opacity: 1,
    transform: 'translateY(0px)',
    transition: { duration: 0.24, ease: easeOut },
  },
  exit: {
    opacity: 0,
    transform: 'translateY(-6px)',
    transition: { duration: 0.18, ease: easeOut },
  },
};

export const pressScale = {
  whileHover: { transform: 'scale(1.01)' },
  whileTap: { transform: 'scale(0.98)' },
  transition: { duration: 0.14, ease: easeOut },
};
