import { motion } from "framer-motion";

// Subtle animated background for voice rooms — soft drifting orbs that give a "live" premium feel.
// Sits absolutely behind room content (z-0). Pointer-events disabled.
export default function VoiceRoomBackdrop() {
  const orbs = [
    { id: 1, color: "hsl(270 100% 65% / 0.25)", x: "10%", y: "15%", size: 220, delay: 0 },
    { id: 2, color: "hsl(320 100% 60% / 0.2)", x: "75%", y: "10%", size: 260, delay: 1.2 },
    { id: 3, color: "hsl(45 100% 55% / 0.18)", x: "20%", y: "70%", size: 200, delay: 2.4 },
    { id: 4, color: "hsl(220 80% 60% / 0.18)", x: "80%", y: "65%", size: 240, delay: 0.6 },
  ];

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      {orbs.map((o) => (
        <motion.div
          key={o.id}
          className="absolute rounded-full blur-3xl"
          style={{
            left: o.x,
            top: o.y,
            width: o.size,
            height: o.size,
            background: o.color,
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -25, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 14,
            delay: o.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      {/* Subtle floating sparkles */}
      {[...Array(8)].map((_, i) => (
        <motion.span
          key={i}
          className="absolute text-xs opacity-30"
          style={{
            left: `${(i * 13) % 100}%`,
            top: `${(i * 17) % 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.15, 0.5, 0.15],
          }}
          transition={{
            duration: 6 + i,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          ✨
        </motion.span>
      ))}
    </div>
  );
}
