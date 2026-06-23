
-- 1) Drop view depending on nova_p columns; will rebuild
DROP VIEW IF EXISTS public.profiles_public CASCADE;

-- 2) Drop NOVA P policy reference + functions + history table
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;
DROP FUNCTION IF EXISTS public.get_nova_p_tier(bigint) CASCADE;
DROP FUNCTION IF EXISTS public.recompute_nova_p(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.record_nova_p_monthly() CASCADE;
DROP TABLE IF EXISTS public.nova_p_monthly_history CASCADE;
DROP INDEX IF EXISTS public.idx_profiles_nova_expiry;

ALTER TABLE public.profiles DROP COLUMN IF EXISTS nova_p_level;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS nova_p_expiry;

-- 3) Rebuild profiles_public view without NOVA P columns
CREATE VIEW public.profiles_public AS
SELECT id, display_name, user_id, avatar_url, vip_level, vip_expiry,
       country_code, gender, level, is_boss, equipped_frame, equipped_badge,
       wealth_level, charisma_level, is_host, is_agent, is_bd, agency_id,
       cover_url, created_at
FROM public.profiles;

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- 4) Recreate safe-fields update policy without NOVA P
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_boss          = (SELECT p.is_boss          FROM public.profiles p WHERE p.id = auth.uid())
  AND coins            = (SELECT p.coins            FROM public.profiles p WHERE p.id = auth.uid())
  AND diamonds         = (SELECT p.diamonds         FROM public.profiles p WHERE p.id = auth.uid())
  AND vip_level        = (SELECT p.vip_level        FROM public.profiles p WHERE p.id = auth.uid())
  AND level            = (SELECT p.level            FROM public.profiles p WHERE p.id = auth.uid())
  AND wealth_xp        = (SELECT p.wealth_xp        FROM public.profiles p WHERE p.id = auth.uid())
  AND wealth_level     = (SELECT p.wealth_level     FROM public.profiles p WHERE p.id = auth.uid())
  AND charisma_xp      = (SELECT p.charisma_xp      FROM public.profiles p WHERE p.id = auth.uid())
  AND charisma_level   = (SELECT p.charisma_level   FROM public.profiles p WHERE p.id = auth.uid())
  AND is_agent         = (SELECT p.is_agent         FROM public.profiles p WHERE p.id = auth.uid())
  AND is_host          = (SELECT p.is_host          FROM public.profiles p WHERE p.id = auth.uid())
  AND NOT (agency_id   IS DISTINCT FROM (SELECT p.agency_id        FROM public.profiles p WHERE p.id = auth.uid()))
  AND total_spend_gold = (SELECT p.total_spend_gold FROM public.profiles p WHERE p.id = auth.uid())
  AND NOT (vip_expiry  IS DISTINCT FROM (SELECT p.vip_expiry       FROM public.profiles p WHERE p.id = auth.uid()))
);

-- 5) POSTS: is_hidden + comment_count
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS comment_count integer NOT NULL DEFAULT 0;

DROP POLICY IF EXISTS "Anyone can read posts" ON public.posts;
CREATE POLICY "Anyone can read visible posts"
ON public.posts FOR SELECT TO authenticated
USING (is_hidden = false OR auth.uid() = user_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- 6) POST_COMMENTS
CREATE TABLE IF NOT EXISTS public.post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read comments"
  ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own comments"
  ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own comments"
  ON public.post_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Author owner or admin delete comments"
  ON public.post_comments FOR DELETE TO authenticated
  USING (
    auth.uid() = user_id
    OR auth.uid() = (SELECT p.user_id FROM public.posts p WHERE p.id = post_id)
    OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin')
  );

CREATE OR REPLACE FUNCTION public.bump_post_comment_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    UPDATE public.posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP='DELETE' THEN
    UPDATE public.posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_comments_count ON public.post_comments;
CREATE TRIGGER trg_post_comments_count
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.bump_post_comment_count();

ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- 7) POST_REPORTS
CREATE TABLE IF NOT EXISTS public.post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason text NOT NULL DEFAULT 'inappropriate',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','dismissed','removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, reporter_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.post_reports TO authenticated;
GRANT ALL ON public.post_reports TO service_role;

ALTER TABLE public.post_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users create reports"
  ON public.post_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Reporter or admin read"
  ON public.post_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_id OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));
CREATE POLICY "Admin manage reports"
  ON public.post_reports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'super_admin'));

-- 8) ROOMS: custom background image
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS background_url text;
