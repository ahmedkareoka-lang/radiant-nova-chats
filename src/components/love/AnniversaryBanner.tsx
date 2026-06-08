import { motion } from "framer-motion";
import { Calendar, Heart } from "lucide-react";
import { differenceInDays, differenceInMonths } from "date-fns";

interface Props {
  anniversaryDate: string;
  emoji?: string;
}

const AnniversaryBanner = ({ anniversaryDate, emoji = "💞" }: Props) => {
  const d = new Date(anniversaryDate);
  const days = differenceInDays(new Date(), d);
  const months = differenceInMonths(new Date(), d);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-3 border-2 border-pink-400/40"
      style={{
        background: "linear-gradient(135deg, hsl(45 95% 25% / 0.4), hsl(330 80% 25% / 0.4))",
        boxShadow: "0 4px 20px hsl(45 95% 60% / 0.25)",
      }}
    >
      {/* Shimmer sweep */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, hsl(45 100% 70% / 0.25), transparent)" }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      <div className="relative flex items-center justify-center gap-3">
        <motion.div animate={{ rotate: [0, 8, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
          <Calendar className="w-5 h-5 text-yellow-300" />
        </motion.div>
        <div className="text-center">
          <p className="text-xs font-bold text-yellow-100 flex items-center justify-center gap-1.5">
            <Heart className="w-3 h-3 fill-pink-400 text-pink-400" />
            {emoji} منذ ارتباطكما
          </p>
          <p className="text-lg font-black text-white">
            {days.toLocaleString()} يوم
            {months >= 1 && <span className="text-xs font-bold text-yellow-200 mr-2">({months} شهر)</span>}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default AnniversaryBanner;
