import { motion } from "framer-motion";

interface NovaSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
}

const NovaSpinner = ({ size = "md", text }: NovaSpinnerProps) => {
  const sizeMap = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" };
  const textSize = { sm: "text-[10px]", md: "text-xs", lg: "text-sm" };

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <motion.div
        className={`${sizeMap[size]} relative`}
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      >
        <div className={`${sizeMap[size]} rounded-full border-[3px] border-primary/20 border-t-primary glow-neon`} />
        <motion.span
          className="absolute inset-0 flex items-center justify-center font-black text-primary"
          style={{ fontSize: size === "sm" ? 12 : size === "md" ? 16 : 20 }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          N
        </motion.span>
      </motion.div>
      {text && <p className={`${textSize[size]} text-muted-foreground font-medium animate-pulse`}>{text}</p>}
    </div>
  );
};

export default NovaSpinner;
