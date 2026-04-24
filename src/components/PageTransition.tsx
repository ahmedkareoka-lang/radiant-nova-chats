import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * Smooth page transition wrapper.
 * Fades + softly scales pages in/out for a buttery navigation feel.
 */
const PageTransition = ({ children }: PageTransitionProps) => (
  <motion.div
    initial={{ opacity: 0, y: 14, scale: 0.985 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -10, scale: 0.99 }}
    transition={{
      duration: 0.38,
      ease: [0.22, 1, 0.36, 1], // cubic-bezier "easeOutExpo"-like
    }}
  >
    {children}
  </motion.div>
);

export default PageTransition;
