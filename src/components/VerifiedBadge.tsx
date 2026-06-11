import { motion } from "framer-motion";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Ultra-HD verification badge displayed next to verified user names.
 * Granted exclusively by the BOSS via boss_set_verified RPC.
 */
export default function VerifiedBadge({ size = 16, className = "" }: Props) {
  return (
    <motion.span
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className={`inline-flex items-center justify-center ${className}`}
      title="حساب موثّق رسمياً من NOVA OFFICIAL"
      aria-label="حساب موثّق"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: "drop-shadow(0 0 6px rgba(59,130,246,0.85)) drop-shadow(0 0 2px rgba(255,255,255,0.9))",
        }}
      >
        <defs>
          <linearGradient id="vb-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#60a5fa" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#1d4ed8" />
          </linearGradient>
          <linearGradient id="vb-shine" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>
        <path
          d="M12 1.5l2.4 2.1 3.2-.3.9 3.1 3 1.2-.8 3.1 2 2.5-2 2.5.8 3.1-3 1.2-.9 3.1-3.2-.3L12 22.5l-2.4-2.1-3.2.3-.9-3.1-3-1.2.8-3.1-2-2.5 2-2.5L2.5 5.2l3-1.2.9-3.1 3.2.3L12 1.5z"
          fill="url(#vb-grad)"
          stroke="#1e3a8a"
          strokeWidth="0.6"
        />
        <path
          d="M8 12.5l2.8 2.8L16 9.5"
          stroke="#ffffff"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M6 4.5 Q12 2 18 4.5 L17 7 Q12 5 7 7 Z"
          fill="url(#vb-shine)"
          opacity="0.55"
        />
      </svg>
    </motion.span>
  );
}
