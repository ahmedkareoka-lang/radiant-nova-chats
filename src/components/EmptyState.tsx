import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

const EmptyState = ({ icon, title, subtitle }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-16 gap-3">
    <motion.span
      className="text-5xl"
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ type: "spring", damping: 10 }}
    >
      {icon}
    </motion.span>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="text-center"
    >
      <p className="text-sm font-bold text-muted-foreground">{title}</p>
      {subtitle && <p className="text-xs text-muted-foreground/60 mt-1">{subtitle}</p>}
    </motion.div>
  </div>
);

export default EmptyState;
