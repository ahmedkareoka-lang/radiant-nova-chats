import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const WINS = [
  "🎰 Ahmed فاز بـ 5,000 💎 في الروليت!",
  "🦁 Sara فازت بـ 2,000 💎 في أسد ضد نمر!",
  "🤝 Mohamed فاز بـ 30,000 💎 تعادل X30!",
];

const GlobalWinTicker = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(prev => (prev + 1) % WINS.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full overflow-hidden bg-gradient-to-r from-yellow-900/20 via-transparent to-yellow-900/20 py-1 px-3">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -300, opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-[10px] font-bold text-yellow-300 text-center whitespace-nowrap"
        >
          {WINS[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

export default GlobalWinTicker;
