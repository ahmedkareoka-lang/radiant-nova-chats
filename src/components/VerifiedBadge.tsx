import { motion } from "framer-motion";

interface Props {
  size?: number;
  className?: string;
}

/**
 * Ultra-HD red scalloped verification badge — NOVA OFFICIAL exclusive.
 * Granted only by the BOSS via boss_set_verified RPC.
 * Animated: pulsing glow + subtle shine sweep + spring-in entry.
 */
export default function VerifiedBadge({ size = 18, className = "" }: Props) {
  // Build a 24-point scalloped circle path
  const cx = 50, cy = 50;
  const points = 24;
  const rOuter = 46;
  const rInner = 41;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI * 2 * i) / (points * 2) - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    d += (i === 0 ? "M" : "L") + x.toFixed(2) + "," + y.toFixed(2) + " ";
  }
  d += "Z";

  return (
    <motion.span
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 16 }}
      className={`inline-flex items-center justify-center align-middle ${className}`}
      title="حساب موثّق رسمياً من NOVA OFFICIAL"
      aria-label="حساب موثّق"
      style={{ width: size, height: size }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          filter: [
            "drop-shadow(0 0 4px rgba(239,68,68,0.7)) drop-shadow(0 0 1px rgba(255,255,255,0.9))",
            "drop-shadow(0 0 10px rgba(239,68,68,1)) drop-shadow(0 0 2px rgba(255,255,255,1))",
            "drop-shadow(0 0 4px rgba(239,68,68,0.7)) drop-shadow(0 0 1px rgba(255,255,255,0.9))",
          ],
        }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id="vb-red-grad" cx="35%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#ff6b6b" />
            <stop offset="45%" stopColor="#ef2b2b" />
            <stop offset="100%" stopColor="#a40d0d" />
          </radialGradient>
          <linearGradient id="vb-shine" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
            <stop offset="50%" stopColor="rgba(255,255,255,0)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <clipPath id="vb-clip">
            <path d={d} />
          </clipPath>
        </defs>

        {/* Scalloped red disc */}
        <path d={d} fill="url(#vb-red-grad)" stroke="#7a0000" strokeWidth="0.8" />

        {/* Top gloss highlight */}
        <ellipse cx="42" cy="30" rx="26" ry="12" fill="rgba(255,255,255,0.25)" />

        {/* Animated shine sweep */}
        <g clipPath="url(#vb-clip)">
          <motion.rect
            x="-40"
            y="0"
            width="40"
            height="100"
            fill="url(#vb-shine)"
            animate={{ x: [-40, 120] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.2 }}
          />
        </g>

        {/* White check mark */}
        <path
          d="M28 52 L44 68 L74 34"
          stroke="#ffffff"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <path
          d="M28 52 L44 68 L74 34"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </motion.svg>
    </motion.span>
  );
}
