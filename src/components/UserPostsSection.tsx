import { useEffect, useRef, useState } from "react";
import { ImagePlus, Send, Heart, X, MessageSquare, Flag, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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

interface Props {
  profileUserId: string;
  currentUserId: string | null;
  authorName?: string;
  authorAvatar?: string | null;
}

export default function UserPostsSection({ profileUserId, currentUserId, authorName, authorAvatar }: Props) {
  const isOwner = currentUserId === profileUserId;
  const fileRef = useRef<HTMLInputElement>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState<Record<string, string>>({});
  const { upload } = useMediaUpload();

  const fetchPosts = async () => {
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", profileUserId)
      .order("created_at", { ascending: false })
      .limit(30);
    const ids = (data || []).map((p) => p.id);
    const { data: likes } = await supabase
      .from("post_likes")
      .select("post_id, user_id")
      .in("post_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);
    const counts = new Map<string, number>();
    const liked = new Set<string>();
    (likes || []).forEach((l) => {
      counts.set(l.post_id, (counts.get(l.post_id) || 0) + 1);
      if (currentUserId && l.user_id === currentUserId) liked.add(l.post_id);
    });
    setPosts(
      (data || []).map((p: any) => ({
        ...p,
        likes_count: counts.get(p.id) || 0,
        liked_by_me: liked.has(p.id),
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    const ch = supabase
      .channel(`user-posts-${profileUserId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${profileUserId}` }, () => fetchPosts())
      .on("postgres_changes", { event: "*", schema: "public", table: "post_likes" }, (payload: any) => {
        const postId = (payload.new?.post_id || payload.old?.post_id) as string | undefined;
        if (!postId) return;
        setPosts((prev) => {
          if (!prev.some((p) => p.id === postId)) return prev;
          return prev.map((p) => {
            if (p.id !== postId) return p;
            const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
            const isMine =
              currentUserId &&
              ((payload.new as any)?.user_id === currentUserId || (payload.old as any)?.user_id === currentUserId);
            return {
              ...p,
              likes_count: Math.max(0, (p.likes_count || 0) + delta),
              liked_by_me: isMine ? payload.eventType === "INSERT" : p.liked_by_me,
            };
          });
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "post_comments" }, (payload: any) => {
        const postId = (payload.new?.post_id || payload.old?.post_id) as string | undefined;
        if (!postId) return;
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const delta = payload.eventType === "INSERT" ? 1 : payload.eventType === "DELETE" ? -1 : 0;
            return { ...p, comment_count: Math.max(0, (p.comment_count || 0) + delta) };
          })
        );
        // If comments drawer is open for this post, refresh its list
        setOpenComments((prev) => {
          if (!prev[postId]) return prev;
          // re-fetch asynchronously
          (async () => {
            const { data } = await (supabase as any)
              .from("post_comments")
              .select("*")
              .eq("post_id", postId)
              .order("created_at", { ascending: true });
            const uids: string[] = Array.from(new Set((data || []).map((c: any) => c.user_id as string)));
            const { data: profs } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url")
              .in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
            const pm = new Map((profs || []).map((p) => [p.id, p]));
            const enriched: Comment[] = (data || []).map((c: any) => ({ ...c, author: pm.get(c.user_id) as any }));
            setOpenComments((cur) => (cur[postId] ? { ...cur, [postId]: enriched } : cur));
          })();
          return prev;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileUserId, currentUserId]);


  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { toast.error("الصورة أكبر من 5MB"); return; }
    setImageFile(f);
    setImagePreview(URL.createObjectURL(f));
  };

  const submitPost = async () => {
    if (!currentUserId || !isOwner) return;
    if (!content.trim() && !imageFile) { toast.error("اكتب شيئاً أو أضف صورة"); return; }
    const c = checkContent(content);
    if (!c.ok) { toast.error("المحتوى يحتوي على كلمات غير لائقة ❌"); return; }
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
        user_id: currentUserId,
        content: content.trim(),
        image_url: imageUrl,
      });
      if (error) throw error;
      supabase.rpc("increment_daily_task", { _user_id: currentUserId, _task_type: "post", _amount: 1 });
      setContent(""); setImageFile(null); setImagePreview(null);
      toast.success("تم النشر ✨");
      await fetchPosts();
    } catch (e: any) {
      toast.error("فشل النشر: " + (e.message || "خطأ"));
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (p: Post) => {
    if (!currentUserId) return;
    if (p.liked_by_me) {
      await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", currentUserId);
    } else {
      await supabase.from("post_likes").insert({ post_id: p.id, user_id: currentUserId });
    }
    setPosts((prev) => prev.map((x) => x.id === p.id ? { ...x, liked_by_me: !x.liked_by_me, likes_count: (x.likes_count || 0) + (x.liked_by_me ? -1 : 1) } : x));
  };

  const deletePost = async (id: string) => {
    await supabase.from("posts").delete().eq("id", id);
    setPosts((prev) => prev.filter((p) => p.id !== id));
    toast.success("تم الحذف");
  };

  const toggleComments = async (postId: string) => {
    if (openComments[postId]) {
      const n = { ...openComments }; delete n[postId]; setOpenComments(n); return;
    }
    const { data } = await (supabase as any).from("post_comments").select("*").eq("post_id", postId).order("created_at", { ascending: true });
    const uids: string[] = Array.from(new Set((data || []).map((c: any) => c.user_id as string)));
    const { data: profs } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", uids.length ? uids : ["00000000-0000-0000-0000-000000000000"]);
    const pm = new Map((profs || []).map((p) => [p.id, p]));
    const enriched: Comment[] = (data || []).map((c: any) => ({ ...c, author: pm.get(c.user_id) as any }));
    setOpenComments((prev) => ({ ...prev, [postId]: enriched }));
  };

  const submitComment = async (postId: string) => {
    if (!currentUserId) return;
    const text = (commentInput[postId] || "").trim();
    if (!text) return;
    const c = checkContent(text);
    if (!c.ok) { toast.error("التعليق يحتوي على كلمات غير لائقة ❌"); return; }
    const { error } = await (supabase as any).from("post_comments").insert({ post_id: postId, user_id: currentUserId, content: text });
    if (error) { toast.error("فشل إضافة التعليق"); return; }
    setCommentInput((p) => ({ ...p, [postId]: "" }));
    await toggleComments(postId); await toggleComments(postId);
    setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p));
  };

  const reportPost = async (postId: string) => {
    if (!currentUserId) return;
    const { error } = await (supabase as any).from("post_reports").insert({ post_id: postId, reporter_id: currentUserId, reason: "inappropriate" });
    if (error && !String(error.message).includes("duplicate")) { toast.error("فشل الإبلاغ"); return; }
    toast.success("تم إرسال البلاغ 🛡️");
  };

  return (
    <div className="space-y-4">
      {isOwner && (
        <div className="rounded-2xl p-3 border border-border/30" style={{ background: "hsl(260 28% 8%)" }}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="شارك شيئاً مع متابعيك..."
            maxLength={500}
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none min-h-[60px]"
          />
          {imagePreview && (
            <div className="relative mt-2 rounded-xl overflow-hidden">
              <img src={imagePreview} alt="" className="w-full max-h-60 object-cover" />
              <button onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/80 flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleImagePick} />
              <button onClick={() => fileRef.current?.click()} className="w-8 h-8 rounded-xl bg-secondary/50 flex items-center justify-center text-accent">
                <ImagePlus className="w-4 h-4" />
              </button>
              <span className="text-[10px] text-muted-foreground">{content.length}/500</span>
            </div>
            <button onClick={submitPost} disabled={posting}
              className="px-3 py-1.5 rounded-xl gradient-neon text-primary-foreground font-bold text-xs flex items-center gap-1.5 disabled:opacity-50">
              <Send className="w-3.5 h-3.5" /> {posting ? "..." : "نشر"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-6 text-muted-foreground text-sm">جاري التحميل...</div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">لا توجد منشورات بعد 📭</div>
      ) : (
        <AnimatePresence>
          {posts.map((p) => {
            const comments = openComments[p.id];
            return (
              <motion.div key={p.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="rounded-2xl p-3 border border-border/30" style={{ background: "hsl(260 28% 8%)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                      <img src={authorAvatar || "https://i.pravatar.cc/32"} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <p className="text-xs font-bold">{authorName || "مستخدم"}</p>
                      <p className="text-[9px] text-muted-foreground">{new Date(p.created_at).toLocaleString("ar")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isOwner && (
                      <button onClick={() => reportPost(p.id)} title="إبلاغ" className="text-muted-foreground hover:text-destructive">
                        <Flag className="w-4 h-4" />
                      </button>
                    )}
                    {isOwner && (
                      <button onClick={() => deletePost(p.id)} className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                {p.content && <p className="text-sm whitespace-pre-wrap mb-2">{p.content}</p>}
                {p.image_url && <img src={p.image_url} alt="" className="w-full rounded-xl object-cover max-h-80 mb-2" />}
                <div className="flex items-center gap-4">
                  <button onClick={() => toggleLike(p)}
                    className={`flex items-center gap-1.5 text-xs font-bold ${p.liked_by_me ? "text-pink-500" : "text-muted-foreground"}`}>
                    <Heart className={`w-4 h-4 ${p.liked_by_me ? "fill-current" : ""}`} /> {p.likes_count || 0}
                  </button>
                  <button onClick={() => toggleComments(p.id)} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-accent">
                    <MessageSquare className="w-4 h-4" /> {p.comment_count || 0}
                  </button>
                </div>
                {comments && (
                  <div className="mt-3 space-y-2 border-t border-border/20 pt-2">
                    {comments.length === 0 && <p className="text-[10px] text-muted-foreground text-center">لا توجد تعليقات بعد</p>}
                    {comments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <img src={c.author?.avatar_url || "https://i.pravatar.cc/24"} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                        <div className="flex-1 bg-secondary/40 rounded-2xl px-3 py-1.5">
                          <p className="text-[10px] font-bold text-accent">{c.author?.display_name || "مستخدم"}</p>
                          <p className="text-xs whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {currentUserId && (
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
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      )}
    </div>
  );
}
