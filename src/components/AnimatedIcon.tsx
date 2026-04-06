import Lottie from "lottie-react";
import { useMemo } from "react";

// Lightweight procedural Lottie data for common icons
const generatePulseCircle = (color: number[]) => ({
  v: "5.7.4",
  fr: 30,
  ip: 0,
  op: 60,
  w: 100,
  h: 100,
  assets: [],
  layers: [
    {
      ty: 4,
      nm: "circle",
      sr: 1,
      ks: {
        o: { a: 1, k: [{ t: 0, s: [100] }, { t: 30, s: [50] }, { t: 60, s: [100] }] },
        s: { a: 1, k: [{ t: 0, s: [100, 100] }, { t: 30, s: [120, 120] }, { t: 60, s: [100, 100] }] },
        p: { a: 0, k: [50, 50] },
        a: { a: 0, k: [0, 0] },
        r: { a: 0, k: 0 },
      },
      shapes: [
        {
          ty: "el",
          p: { a: 0, k: [0, 0] },
          s: { a: 0, k: [40, 40] },
        },
        {
          ty: "fl",
          c: { a: 0, k: color },
          o: { a: 0, k: 100 },
        },
      ],
      ip: 0,
      op: 60,
    },
  ],
});

interface AnimatedIconProps {
  type: "live" | "vip" | "active";
  className?: string;
}

const colorMap = {
  live: [0.6, 0.2, 1, 1],    // purple
  vip: [1, 0.8, 0.2, 1],     // gold
  active: [0.2, 0.8, 0.4, 1], // green
};

const AnimatedIcon = ({ type, className = "w-6 h-6" }: AnimatedIconProps) => {
  const animationData = useMemo(() => generatePulseCircle(colorMap[type]), [type]);

  return (
    <div className={className}>
      <Lottie animationData={animationData} loop autoplay />
    </div>
  );
};

export default AnimatedIcon;
