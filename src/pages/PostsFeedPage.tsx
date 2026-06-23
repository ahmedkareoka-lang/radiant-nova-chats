import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ImagePlus, Send, Heart, X, MessageSquare, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { useMediaUpload } from "@/hooks/useMediaUpload";
import { checkContent } from "@/lib/contentFilter";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  created_at: string;
  comment_count?: number;
  author?: { display_name: string; avatar_url: string | null };
  likes_count?: number;
  liked_by_me?: boolean;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  author?: { display_name: string; avatar_url: string | null };
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
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
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
      (postsData || []).map((p: any) => ({
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
    // 🛡️ Content filter
    const check = checkContent(content);
    if (!check.ok) {
      toast.error(`المحتوى يحتوي على كلمات غير لائقة ❌`);
      return;
    }
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
      supabase.rpc("increment_daily_task", { _user_id: userId, _task_type: "post", _amount: 1 });
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
      supabase.rpc("increment_daily_task", { _user_id: userId, _task_type: "like", _amount: 1 });
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

  const toggleComments = async (postId: string) => {
    if (openComments[postId]) {
      const next = { ...openComments };
      delete next[postId];
      setOpenComments(next);
      return;
    }
    const { data } = await (supabase as any).from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const uids = Array.from(new Set((data || []).map((c: any) => c.user_id)));
    const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
    const pm = new Map((profs || []).map((p) => [p.id, p]));
    const enriched: Comment[] = (data || []).map((c: any) => ({ ...c, author: pm.get(c.user_id) as any }));
    setOpenComments((prev) => ({ ...prev, [postId]: enriched }));
  };

  const submitComment = async (postId: string) => {
    if (!userId) return;
    const text = (commentInput[postId] || "").trim();
    if (!text) return;
    const check = checkContent(text);
    if (!check.ok) { toast.error("التعليق يحتوي على كلمات غير لائقة ❌"); return; }
    const { error } = await (supabase as any).from("post_comments").insert({ post_id: postId, user_id: userId, content: text });
    if (error) { toast.error("فشل إضافة التعليق"); return; }
    setCommentInput((p) => ({ ...p, [postId]: "" }));
    await toggleComments(postId); // close
    await toggleComments(postId); // re-fetch
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
  };

  const reportPost = async (postId: string) => {
    if (!userId) return;
    const { error } = await (supabase as any).from("post_reports").insert({ post_id: postId, reporter_id: userId, reason: "inappropriate" });
    if (error && !String(error.message).includes("duplicate")) {
      toast.error("فشل الإبلاغ");
      return;
    }
    toast.success("تم إرسال البلاغ، شكراً لمساعدتنا في حماية المجتمع 🛡️");
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
                <img loading="lazy" decoding="async" src={imagePreview} alt="" className="w-full max-h-72 object-cover" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center"
                ><X className="w-4 h-4" /></button>
              </div>
            )}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-2">
                <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
                <button onClick={() => fileRef.current?.click()} className="w-9 h-9 rounded-xl bg-secondary/50 flex items-center justify-center text-accent">
                  <ImagePlus className="w-5 h-5" />
                </button>
                <span className="text-[10px] text-muted-foreground">{content.length}/500</span>
              </div>
              <button onClick={submitPost} disabled={posting}
                className="px-4 py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm flex items-center gap-2 disabled:opacity-50">
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
              {posts.map((p) => {
                const comments = openComments[p.id];
                return (
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
                          <img src={p.author?.avatar_url || "https://i.pravatar.cc/40"} alt={p.author?.display_name || "avatar"}
                            loading="lazy" decoding="async" width={40} height={40} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{p.author?.display_name || "مستخدم"}</p>
                          <p className="text-[10px] text-muted-foreground">{new Date(p.created_at).toLocaleString("ar")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.user_id !== userId && (
                          <button onClick={() => reportPost(p.id)} title="إبلاغ" className="text-xs text-muted-foreground hover:text-destructive">
                            <Flag className="w-4 h-4" />
                          </button>
                        )}
                        {p.user_id === userId && (
                          <button onClick={() => deletePost(p.id)} className="text-xs text-destructive">حذف</button>
                        )}
                      </div>
                    </div>
                    {p.content && <p className="text-sm whitespace-pre-wrap mb-3">{p.content}</p>}
                    {p.image_url && (
                      <img src={p.image_url} alt="post" loading="lazy" decoding="async" className="w-full rounded-xl object-cover max-h-96 mb-3" />
                    )}
                    <div className="flex items-center gap-5">
                      <button onClick={() => toggleLike(p)}
                        className={`flex items-center gap-2 text-sm font-bold transition-colors ${p.liked_by_me ? "text-pink-500" : "text-muted-foreground"}`}>
                        <Heart className={`w-5 h-5 ${p.liked_by_me ? "fill-current" : ""}`} /> {p.likes_count || 0}
                      </button>
                      <button onClick={() => toggleComments(p.id)} className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-accent">
                        <MessageSquare className="w-5 h-5" /> {p.comment_count || 0}
                      </button>
                    </div>

                    {/* Comments */}
                    {comments && (
                      <div className="mt-4 space-y-3 border-t border-border/20 pt-3">
                        {comments.length === 0 && (
                          <p className="text-[11px] text-muted-foreground text-center">لا توجد تعليقات بعد</p>
                        )}
                        {comments.map((c) => (
                          <div key={c.id} className="flex items-start gap-2">
                            <img src={c.author?.avatar_url || "https://i.pravatar.cc/32"} alt="" loading="lazy" decoding="async"
                              className="w-7 h-7 rounded-full object-cover shrink-0" />
                            <div className="flex-1 bg-secondary/40 rounded-2xl px-3 py-1.5">
                              <p className="text-[10px] font-bold text-accent">{c.author?.display_name || "مستخدم"}</p>
                              <p className="text-xs whitespace-pre-wrap">{c.content}</p>
                            </div>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            value={commentInput[p.id] || ""}
                            onChange={(e) => setCommentInput((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            placeholder="أضف تعليقاً..."
                            maxLength={500}
                            className="flex-1 bg-background rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary"
                          />
                          <button onClick={() => submitComment(p.id)} className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default PostsFeedPage;
