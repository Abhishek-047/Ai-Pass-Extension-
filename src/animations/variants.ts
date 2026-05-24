import type { Variants } from 'framer-motion'

// Premium Spring Presets for elastic & responsive physics
export const springTransition = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 26,
}

export const springSlow = {
  type: 'spring' as const,
  stiffness: 220,
  damping: 22,
}

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -12, transition: { duration: 0.2 } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.3 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const slideInRight: Variants = {
  initial: { opacity: 0, x: 45 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, x: -25, transition: { duration: 0.2 } },
}

export const slideInFromRight: Variants = {
  initial: { opacity: 0, x: 60 },
  animate: { opacity: 1, x: 0, transition: springTransition },
  exit: { opacity: 0, x: -40, transition: { duration: 0.15 } },
}

export const fadeScale: Variants = {
  initial: { opacity: 0, scale: 0.93 },
  animate: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 420, damping: 28 } },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.12 } },
}

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.92 },
  animate: { opacity: 1, scale: 1, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
}

export const staggerContainer: Variants = {
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
}

export const lockAnimation: Variants = {
  locked: { rotate: 0, scale: 1 },
  unlocking: { rotate: [0, -8, 8, -4, 0], scale: [1, 1.08, 1], transition: { duration: 0.55 } },
  unlocked: { scale: 1, rotate: 0 },
}

export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 15px rgba(124, 58, 237, 0.25)',
      '0 0 35px rgba(124, 58, 237, 0.55)',
      '0 0 15px rgba(124, 58, 237, 0.25)',
    ],
    transition: { duration: 2.2, repeat: Infinity, ease: 'easeInOut' },
  },
}

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.92, y: 45 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 350, damping: 22, mass: 1.2 } },
  exit: { opacity: 0, scale: 0.96, y: 25, transition: { duration: 0.2, ease: [0.25, 1, 0.5, 1] } },
}

export const toastVariants: Variants = {
  initial: { opacity: 0, y: 25, scale: 0.94 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.88, y: -15, transition: { duration: 0.2 } },
}

export const hoverLift: Variants = {
  initial: { y: 0 },
  hover: { y: -3, transition: { type: 'spring' as const, stiffness: 400, damping: 25 } },
  tap: { y: 0, scale: 0.98, transition: { duration: 0.1 } }
}

export const pulseGlow: Variants = {
  initial: { opacity: 0.8, scale: 0.95 },
  animate: { 
    opacity: 1, 
    scale: 1,
    boxShadow: [
      '0 0 0 0 rgba(124, 58, 237, 0)',
      '0 0 0 10px rgba(124, 58, 237, 0.15)',
      '0 0 0 20px rgba(124, 58, 237, 0)'
    ],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' } 
  }
}
