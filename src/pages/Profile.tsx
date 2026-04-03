import { Settings, Edit, Crown, Coins, Diamond, Star, Users } from "lucide-react";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";

const stats = [
  { label: "Followers", value: "1.2K", icon: Users },
  { label: "Following", value: "348", icon: Star },
  { label: "Gifts Sent", value: "5.4K", icon: Crown },
];

const micStyles = [
  { name: "Circle", preview: "rounded-full", active: true },
  { name: "Square", preview: "rounded-lg", active: false },
  { name: "VIP Diamond", preview: "rounded-full ring-2 ring-gold", active: false },
];

const Profile = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header Background */}
      <div className="relative h-48 gradient-neon overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        <button className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-background/30 backdrop-blur flex items-center justify-center">
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <main className="px-4 max-w-lg mx-auto -mt-16 relative z-10">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-28 h-28 rounded-full overflow-hidden ring-4 ring-gold animate-pulse-glow">
              <img src="https://i.pravatar.cc/200?img=3" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-neon flex items-center justify-center glow-neon">
              <Edit className="w-3.5 h-3.5 text-primary-foreground" />
            </button>
            <div className="absolute -top-2 -right-2">
              <Crown className="w-7 h-7 text-gold animate-float" />
            </div>
          </div>
          <h2 className="font-extrabold text-xl mt-3 glow-neon-text">Nova User</h2>
          <span className="text-xs text-muted-foreground mb-2">ID: 482917</span>
          <VipBadge level={5} size="lg" />
        </div>

        {/* Balances */}
        <div className="flex gap-3 mt-6">
          <div className="flex-1 card-nova p-3 flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" />
            <div>
              <p className="text-[10px] text-muted-foreground">Coins</p>
              <p className="font-bold text-sm text-gold">14,000</p>
            </div>
          </div>
          <div className="flex-1 card-nova p-3 flex items-center gap-2">
            <Diamond className="w-5 h-5 text-neon-purple" />
            <div>
              <p className="text-[10px] text-muted-foreground">Diamonds</p>
              <p className="font-bold text-sm text-neon-purple">5,000</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {stats.map((stat) => (
            <div key={stat.label} className="card-nova p-3 text-center">
              <stat.icon className="w-4 h-4 text-neon-purple mx-auto mb-1" />
              <p className="font-bold text-sm">{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Mic Style */}
        <div className="mt-6">
          <h3 className="font-bold text-sm mb-3">Mic Style</h3>
          <div className="flex gap-3">
            {micStyles.map((style) => (
              <button
                key={style.name}
                className={`flex-1 card-nova p-4 flex flex-col items-center gap-2 transition-all ${
                  style.active ? "border-neon-purple glow-neon" : "hover:border-neon-purple/30"
                }`}
              >
                <div className={`w-10 h-10 bg-neon-purple/30 ${style.preview}`} />
                <span className="text-[10px] font-semibold">{style.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Edit Profile Button */}
        <button className="w-full mt-6 py-3 rounded-full gradient-neon font-bold text-primary-foreground btn-nova glow-neon">
          Edit Profile
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default Profile;
