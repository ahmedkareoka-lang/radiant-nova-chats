-- 1) Clean up duplicate active rooms per host: keep only the most recent
WITH ranked AS (
  SELECT id, host_id, created_at,
         ROW_NUMBER() OVER (PARTITION BY host_id ORDER BY created_at DESC) AS rn
  FROM public.rooms
  WHERE is_active = true
)
UPDATE public.rooms
SET is_active = false
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- Also delete orphan room_members for inactive rooms
DELETE FROM public.room_members rm
USING public.rooms r
WHERE rm.room_id = r.id AND r.is_active = false;

-- 2) Enforce: at most one active room per host
DROP INDEX IF EXISTS public.unique_active_room_per_host;
CREATE UNIQUE INDEX unique_active_room_per_host
  ON public.rooms (host_id)
  WHERE is_active = true;

-- 3) Storage policies for `assets` bucket — allow authenticated users to upload/read
-- Drop old conflicting policies if any
DROP POLICY IF EXISTS "Authenticated can upload to assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete own assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all assets" ON storage.objects;

CREATE POLICY "Public can read assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Authenticated can upload to assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Authenticated can update own assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'assets' AND owner = auth.uid());

CREATE POLICY "Authenticated can delete own assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'assets' AND owner = auth.uid());

CREATE POLICY "Admins can manage all assets"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'assets' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
)
WITH CHECK (
  bucket_id = 'assets' AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  )
);

-- 4) Enable realtime for tables that need instant updates
ALTER TABLE public.gifts REPLICA IDENTITY FULL;
ALTER TABLE public.store_items REPLICA IDENTITY FULL;
ALTER TABLE public.banners REPLICA IDENTITY FULL;
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 5) RPC: add coins (used by games for wins, fixes diamond-instead-of-coins bug)
CREATE OR REPLACE FUNCTION public.add_coins(_user_id uuid, _amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET coins = coins + _amount WHERE id = _user_id;
END;
$$;