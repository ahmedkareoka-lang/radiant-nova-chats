import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Camera, Save, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import CustomEntranceEffect from "@/components/CustomEntranceEffect";

const COUNTRIES = [
  { code: "SA", name: "السعودية 🇸🇦" },
  { code: "EG", name: "مصر 🇪🇬" },
  { code: "MA", name: "المغرب 🇲🇦" },
  { code: "IQ", name: "العراق 🇮🇶" },
  { code: "SY", name: "سوريا 🇸🇾" },
  { code: "YE", name: "اليمن 🇾🇪" },
  { code: "JO", name: "الأردن 🇯🇴" },
  { code: "LB", name: "لبنان 🇱🇧" },
  { code: "AE", name: "الإمارات 🇦🇪" },
  { code: "KW", name: "الكويت 🇰🇼" },
  { code: "US", name: "أمريكا 🇺🇸" },
  { code: "TR", name: "تركيا 🇹🇷" },
];

const EditProfile = () => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entranceVideoUrl, setEntranceVideoUrl] = useState("");
  const [entranceAudioUrl, setEntranceAudioUrl] = useState("");
  const [showTestEntrance, setShowTestEntrance] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data) {
        setProfile(data);
        setDisplayName(data.display_name || "");
        setAge(data.age?.toString() || "");
        setCountryCode(data.country_code || "");
        setEntranceVideoUrl((data as any).entrance_video_url || "");
        setEntranceAudioUrl((data as any).entrance_audio_url || "");
      }
    };
    load();
  }, [navigate]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("حجم الصورة يجب أن يكون أقل من 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `avatars/${profile.id}.${ext}`;
      await supabase.storage.from("assets").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const avatar_url = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("profiles").update({ avatar_url }).eq("id", profile.id);
      setProfile({ ...profile, avatar_url });
      toast.success("تم تحديث الصورة! 📸");
    } catch (err: any) { toast.error("فشل رفع الصورة"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const updates: any = {
      display_name: displayName.trim() || profile.display_name,
      country_code: countryCode || profile.country_code,
      entrance_video_url: entranceVideoUrl.trim() || null,
      entrance_audio_url: entranceAudioUrl.trim() || null,
    };
    if (age && parseInt(age) >= 13 && parseInt(age) <= 99) {
      updates.age = parseInt(age);
    }
    const { error } = await supabase.from("profiles").update(updates).eq("id", profile.id);
    if (error) {
      toast.error("فشل في حفظ التغييرات");
    } else {
      toast.success("تم حفظ التغييرات! ✅");
      setProfile({ ...profile, ...updates });
    }
    setSaving(false);
  };

  const testEntrance = () => {
    if (!entranceVideoUrl && !entranceAudioUrl) {
      toast.error("أضف رابط فيديو أو صوت الدخول أولاً");
      return;
    }
    setShowTestEntrance(true);
  };

  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" /></div>;
  }

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />

        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
            <h1 className="font-bold text-lg">تعديل الملف الشخصي</h1>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-primary/50">
                <img src={profile.avatar_url || "https://i.pravatar.cc/200?img=3"} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full gradient-neon flex items-center justify-center">
                {uploading ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-4 h-4 text-primary-foreground" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">ID: {profile.user_id}</p>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">الاسم</label>
              <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={20}
                className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">العمر</label>
              <input type="number" value={age} onChange={(e) => setAge(e.target.value)} min={13} max={99} placeholder="13-99"
                className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-muted-foreground">الدولة</label>
              <select value={countryCode} onChange={(e) => setCountryCode(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="">اختر الدولة</option>
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Custom Entrance Section */}
            <div className="card-nova p-4 space-y-3">
              <h3 className="font-bold text-sm flex items-center gap-2">🎬 تأثير الدخول المخصص</h3>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">رابط فيديو الدخول (WebM)</label>
                <input type="url" value={entranceVideoUrl} onChange={(e) => setEntranceVideoUrl(e.target.value)}
                  placeholder="https://example.com/entrance.webm"
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-muted-foreground">رابط صوت الدخول (MP3)</label>
                <input type="url" value={entranceAudioUrl} onChange={(e) => setEntranceAudioUrl(e.target.value)}
                  placeholder="https://example.com/entrance.mp3"
                  className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <button onClick={testEntrance}
                className="w-full py-2 rounded-xl bg-secondary text-foreground font-bold text-xs flex items-center justify-center gap-2 hover:bg-secondary/80 transition-all">
                <Play className="w-4 h-4 text-primary" /> معاينة تأثير الدخول
              </button>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving}
            className="w-full py-3 rounded-full gradient-neon text-primary-foreground font-bold btn-nova glow-neon flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            حفظ التغييرات
          </button>

          <button onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}
            className="w-full py-3 rounded-full border border-destructive/50 text-destructive font-bold text-sm">
            تسجيل الخروج
          </button>
        </main>

        <BottomNav />

        {/* Test Entrance Effect */}
        {showTestEntrance && (
          <CustomEntranceEffect
            queue={[{
              id: "test-" + Date.now(),
              displayName: profile.display_name || "أنت",
              avatarUrl: profile.avatar_url,
              videoUrl: entranceVideoUrl || null,
              audioUrl: entranceAudioUrl || null,
            }]}
            onComplete={() => setShowTestEntrance(false)}
            muteEntrance={false}
          />
        )}
      </div>
    </PageTransition>
  );
};

export default EditProfile;
