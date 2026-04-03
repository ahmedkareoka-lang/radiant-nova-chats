import { useState } from "react";
import { ArrowLeft, Coins, Diamond, CreditCard, Smartphone, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const packages = [
  { price: 50, coins: 7000, diamonds: 5000, bonus: 0 },
  { price: 100, coins: 14000, diamonds: 10000, bonus: 0 },
  { price: 200, coins: 28000, diamonds: 20000, bonus: 5 },
  { price: 500, coins: 70000, diamonds: 50000, bonus: 10 },
  { price: 1000, coins: 140000, diamonds: 100000, bonus: 15, popular: true },
  { price: 2000, coins: 280000, diamonds: 200000, bonus: 20 },
  { price: 5000, coins: 700000, diamonds: 500000, bonus: 25 },
  { price: 7000, coins: 980000, diamonds: 700000, bonus: 30 },
];

const paymentMethods = [
  { id: "vodafone", name: "Vodafone Cash", icon: "📱", color: "bg-red-500/20 text-red-400 border-red-500/30" },
  { id: "etisalat", name: "Etisalat Cash", icon: "📱", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  { id: "orange", name: "Orange Cash", icon: "📱", color: "bg-orange-500/20 text-orange-400 border-orange-500/30" },
  { id: "visa", name: "Visa / Card", icon: "💳", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  { id: "usdt", name: "USDT", icon: "💲", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
];

const TopUpPage = () => {
  const navigate = useNavigate();
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const formatNum = (n: number) => n.toLocaleString();

  const handlePurchase = () => {
    if (selectedPackage !== null && selectedPayment) {
      setShowConfirm(true);
      setTimeout(() => setShowConfirm(false), 3000);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Top Up</h1>
          <div className="ml-auto flex items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
              <Coins className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-bold text-gold">14,000</span>
            </div>
            <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
              <Diamond className="w-3.5 h-3.5 text-neon-purple" />
              <span className="text-xs font-bold text-neon-purple">5,000</span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {/* Conversion Info */}
        <div className="card-nova p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Exchange Rate</p>
          <div className="flex items-center justify-center gap-3">
            <div className="flex items-center gap-1">
              <Coins className="w-4 h-4 text-gold" />
              <span className="font-bold text-gold">10,000</span>
            </div>
            <span className="text-muted-foreground">=</span>
            <div className="flex items-center gap-1">
              <Diamond className="w-4 h-4 text-neon-purple" />
              <span className="font-bold text-neon-purple">5,000</span>
            </div>
          </div>
        </div>

        {/* Packages */}
        <div>
          <h2 className="text-sm font-bold mb-3">Select Package</h2>
          <div className="grid grid-cols-2 gap-3">
            {packages.map((pkg, i) => (
              <button
                key={i}
                onClick={() => setSelectedPackage(i)}
                className={`relative card-nova p-3 text-left transition-all duration-200 ${
                  selectedPackage === i
                    ? "border-neon-purple glow-neon scale-[1.02]"
                    : "hover:border-neon-purple/30"
                } ${pkg.popular ? "border-gold/40" : ""}`}
              >
                {pkg.popular && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full gradient-gold text-[9px] font-bold text-accent-foreground flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> POPULAR
                  </div>
                )}
                {pkg.bonus > 0 && (
                  <div className="absolute -top-2 -right-1 px-1.5 py-0.5 rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    +{pkg.bonus}%
                  </div>
                )}
                <p className="font-extrabold text-lg">{formatNum(pkg.price)} <span className="text-xs font-normal text-muted-foreground">EGP</span></p>
                <div className="flex items-center gap-1 mt-1">
                  <Coins className="w-3 h-3 text-gold" />
                  <span className="text-xs font-semibold text-gold">{formatNum(pkg.coins)}</span>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Diamond className="w-3 h-3 text-neon-purple" />
                  <span className="text-[10px] text-muted-foreground">{formatNum(pkg.diamonds)}</span>
                </div>
                {selectedPackage === i && (
                  <div className="absolute top-2 right-2">
                    <Check className="w-4 h-4 text-neon-purple" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Methods */}
        <div>
          <h2 className="text-sm font-bold mb-3">Payment Method</h2>
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <button
                key={method.id}
                onClick={() => setSelectedPayment(method.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200 ${
                  selectedPayment === method.id
                    ? `${method.color} border glow-neon`
                    : "bg-secondary border-transparent hover:border-border"
                }`}
              >
                <span className="text-xl">{method.icon}</span>
                <span className="font-semibold text-sm flex-1 text-left">{method.name}</span>
                {selectedPayment === method.id && <Check className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Button */}
        <button
          onClick={handlePurchase}
          disabled={selectedPackage === null || !selectedPayment}
          className="w-full py-4 rounded-full gradient-neon font-extrabold text-lg text-primary-foreground btn-nova glow-neon disabled:opacity-40 disabled:shadow-none"
        >
          {selectedPackage !== null
            ? `Pay ${formatNum(packages[selectedPackage].price)} EGP`
            : "Select a Package"}
        </button>

        {/* Withdrawal Info */}
        <div className="card-nova p-4 text-center space-y-1">
          <p className="text-xs font-bold text-gold">💎 Diamond Withdrawal</p>
          <p className="text-[11px] text-muted-foreground">First withdrawal: $10 minimum</p>
          <p className="text-[11px] text-muted-foreground">Withdrawals are through your Agency only</p>
        </div>
      </main>

      {/* Success Toast */}
      {showConfirm && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-vip-entrance">
          <div className="gradient-gold px-6 py-3 rounded-2xl glow-gold flex items-center gap-2">
            <Check className="w-5 h-5 text-accent-foreground" />
            <span className="font-bold text-accent-foreground text-sm">Payment Request Sent! ✨</span>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default TopUpPage;
