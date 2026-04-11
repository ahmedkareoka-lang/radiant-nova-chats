import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotSpeed: number;
}

const THEME_CONFIG: Record<string, { count: number; emoji?: string; color: string; sizeRange: [number, number]; speedRange: [number, number] }> = {
  space: { count: 40, emoji: "✦", color: "rgba(200,200,255,0.6)", sizeRange: [1, 3], speedRange: [0.1, 0.4] },
  ocean: { count: 25, emoji: "●", color: "rgba(100,200,255,0.4)", sizeRange: [3, 8], speedRange: [0.2, 0.6] },
  forest: { count: 20, emoji: "🍃", color: "rgba(100,200,100,0.5)", sizeRange: [8, 14], speedRange: [0.3, 0.8] },
  neon: { count: 30, emoji: "✦", color: "rgba(200,100,255,0.5)", sizeRange: [1, 4], speedRange: [0.2, 0.5] },
  sunset: { count: 15, emoji: "✦", color: "rgba(255,180,100,0.4)", sizeRange: [2, 5], speedRange: [0.1, 0.3] },
  aurora: { count: 25, emoji: "✦", color: "rgba(100,255,200,0.4)", sizeRange: [2, 4], speedRange: [0.15, 0.4] },
};

const RoomParticles = ({ theme }: { theme: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);

  const config = THEME_CONFIG[theme];

  useEffect(() => {
    if (!config) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    particlesRef.current = Array.from({ length: config.count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
      speedX: (Math.random() - 0.5) * config.speedRange[1],
      speedY: -(config.speedRange[0] + Math.random() * (config.speedRange[1] - config.speedRange[0])),
      opacity: 0.3 + Math.random() * 0.7,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 2,
    }));

    const draw = () => {
      const cw = canvas.offsetWidth;
      const ch = canvas.offsetHeight;
      ctx.clearRect(0, 0, cw, ch);

      for (const p of particlesRef.current) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;

        if (p.y < -20) { p.y = ch + 10; p.x = Math.random() * cw; }
        if (p.x < -20) p.x = cw + 10;
        if (p.x > cw + 20) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.opacity;

        if (theme === "ocean") {
          // Bubbles
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = config.color;
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.fillStyle = config.color.replace("0.4", "0.1");
          ctx.fill();
        } else if (theme === "forest") {
          ctx.font = `${p.size}px serif`;
          ctx.fillText("🍃", -p.size / 2, p.size / 2);
        } else {
          // Stars / sparkles
          ctx.fillStyle = config.color;
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ opacity: 0.7 }}
    />
  );
};

export default RoomParticles;
