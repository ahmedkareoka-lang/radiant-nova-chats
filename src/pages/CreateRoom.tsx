import { useState } from "react";
import { ArrowLeft, Lock, Globe, Mic } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";

const roomTypes = [
  { label: "Chat", emoji: "💬" },
  { label: "Music", emoji: "🎵" },
  { label: "Gaming", emoji: "🎮" },
  { label: "VIP", emoji: "👑" },
];

const micCounts = [8, 12, 16, 20];

const CreateRoom = () => {
  const navigate = useNavigate();
  const [roomName, setRoomName] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState("");
  const [selectedType, setSelectedType] = useState(0);
  const [selectedMics, setSelectedMics] = useState(8);

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">Create Room</h1>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* Room Name */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-2 block">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name..."
            className="w-full bg-secondary rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon-purple transition-all"
          />
        </div>

        {/* Privacy */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-3 block">Privacy</label>
          <div className="flex gap-3">
            <button
              onClick={() => setIsPrivate(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all ${
                !isPrivate ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Globe className="w-4 h-4" />
              Public
            </button>
            <button
              onClick={() => setIsPrivate(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold transition-all ${
                isPrivate ? "gradient-neon text-primary-foreground glow-neon" : "bg-secondary text-muted-foreground"
              }`}
            >
              <Lock className="w-4 h-4" />
              Private
            </button>
          </div>
          {isPrivate && (
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Set password..."
              className="w-full mt-3 bg-secondary rounded-2xl px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-neon-purple transition-all"
            />
          )}
        </div>

        {/* Room Type */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-3 block">Room Type</label>
          <div className="grid grid-cols-4 gap-2">
            {roomTypes.map((type, i) => (
              <button
                key={type.label}
                onClick={() => setSelectedType(i)}
                className={`flex flex-col items-center gap-1.5 py-3 rounded-2xl font-semibold transition-all ${
                  selectedType === i
                    ? "bg-neon-purple/20 border border-neon-purple text-foreground glow-neon"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <span className="text-xl">{type.emoji}</span>
                <span className="text-[10px]">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Mic Count */}
        <div>
          <label className="text-sm font-semibold text-muted-foreground mb-3 block">
            <Mic className="w-4 h-4 inline mr-1" />
            Mic Slots
          </label>
          <div className="flex gap-3">
            {micCounts.map((count) => (
              <button
                key={count}
                onClick={() => setSelectedMics(count)}
                className={`flex-1 py-3 rounded-2xl font-bold text-sm transition-all ${
                  selectedMics === count
                    ? "gradient-gold text-accent-foreground glow-gold"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {count}
              </button>
            ))}
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => navigate("/voice-room")}
          className="w-full py-4 rounded-full gradient-neon font-extrabold text-lg text-primary-foreground btn-nova glow-neon mt-4"
        >
          ✨ Create Room
        </button>
      </main>

      <BottomNav />
    </div>
  );
};

export default CreateRoom;
