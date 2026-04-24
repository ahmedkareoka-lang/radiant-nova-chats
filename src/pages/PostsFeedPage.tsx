import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Send, Heart, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaUpload } from "@/hooks/useMediaUpload";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  author?: { display_name: string; avatar_url: string | null };
  likes_count?: number;
  liked_by_me?: boolean;
}

const PostsFeedPage = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { upload } = useMediaUpload();

  const fetchPosts = async (uid: string | null) => {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    const userIds = Array.from(new Set((postsData || []).map((p) => p.user_id)));
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);
    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    const postIds = (postsData || []).map((p) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", postIds.length ? postIds : ["00000000-0000-0000-0000-000000000000"]);

    const likeCounts = new Map<string, number>();
    const likedByMe = new Set<string>();
    (likes || []).forEach((l) => {
      likeCounts.set(l.post_id, (likeCounts.get(l.post_id) || 0) + 1);
      if (uid && l.user_id === uid) likedByMe.add(l.post_id);
    });

    setPosts(
      (postsData || []).map((p) => ({
        ...p,
        author: profileMap.get(p.user_id) as any,
        likes_count: likeCounts.get(p.id) || 0,
        liked_by_me: likedByMe.has(p.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
      await fetchPosts(user.id);
    })();

    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) fetchPosts(user.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("الصورة أكبر من 5MB"); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submitPost = async () => {
    if (!userId) return;
    if (!content.trim() && !imageFile) { toast.error("اكتب شيئاً أو أضف صورة"); return; }
    setPosting(true);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        const isGif = imageFile.type === "image/gif" || imageFile.name.toLowerCase().endsWith(".gif");
        const url = await upload({ file: imageFile, fileType: isGif ? "gif" : "image", folder: "posts" });
        if (!url) { setPosting(false); return; }
        imageUrl = url;
      }
      const { error } = await supabase.from("posts").insert({
        user_id: userId,
        content: content.trim(),
        image_url: imageUrl,
      });
      if (error) throw error;
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      toast.success("تم النشر! ✨");
      await fetchPosts(userId);
    } catch (err: any) {
      toast.error("فشل النشر: " + (err.message || "خطأ"));
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (post: Post) => {
    if (!userId) return;
    if (post.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", userId);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: userId });
    }
    setPosts((prev) => prev.map((p) => p.id === post.id
      ? { ...p, liked_by_me: !p.liked_by_me, likes_count: (p.likes_count || 0) + (p.liked_by_me ? -1 : 1) }
      : p));
  };

  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("تم الحذف");
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-accent">📝 المنشورات</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          {/* Composer */}
          <div className="rounded-2xl p-4 border border-border/30" style={{ background: "hsl(260 28% 8%)" }}>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ما الذي يدور في ذهنك؟"
              maxLength={500}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none min-h-[80px]"
            />
            {imagePreview && (
              <div className="relative mt-2 rounded-xl overflow-hidden">
                <img src={imagePreview} alt="" className="w-full max-h-72 object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-accent"
                >
                  <ImagePlus className="w-5 h-5" />
                </button>
                <span className="text-[10px] text-muted-foreground">{content.length}/500</span>
              </div>
              <button
                onClick={submitPost}
                disabled={posting}
                className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" /> {posting ? "جاري النشر..." : "نشر"}
              </button>
            </div>
          </div>

          {/* Feed */}
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">جاري التحميل...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-sm">لا توجد منشورات بعد</p>
              <p className="text-xs mt-1">كن أول من ينشر! 🚀</p>
            </div>
          ) : (
            <AnimatePresence>
              {posts.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-2xl p-4 border border-border/30"
                  style={{ background: "hsl(260 28% 8%)" }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-secondary">
                        <img
                          src={p.author?.avatar_url || "https://i.pravatar.cc/40"}
                          alt={p.author?.display_name || "avatar"}
                          loading="lazy"
                          decoding="async"
                          width={40}
                          height={40}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-sm font-bold">{p.author?.display_name || "مستخدم"}</p>
                        <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("ar")}</p>
                      </div>
                    </div>
                    {p.user_id === userId && (
                      <button onClick={() => deletePost(p.id)} className="text-xs text-destructive">حذف</button>
                    )}
                  </div>
                  {p.content && <p className="text-sm whitespace-pre-wrap mb-3">{p.content}</p>}
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt="post"
                      loading="lazy"
                      decoding="async"
                      className="w-full rounded-xl object-cover max-h-96 mb-3"
                    />
                  )}
                  <button
                    onClick={() => toggleLike(p)}
                    className={`flex items-center gap-2 text-sm font-bold transition-colors ${
                      p.liked_by_me ? "text-pink-500" : "text-muted-foreground"
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${p.liked_by_me ? "fill-current" : ""}`} /> {p.likes_count || 0}
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default PostsFeedPage;
