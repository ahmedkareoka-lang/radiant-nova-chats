-- Enable realtime for all asset tables (idempotent)
DO $$
BEGIN
  -- posts
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.posts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.banners; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.store_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_plans; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.system_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- Set REPLICA IDENTITY FULL for proper realtime payloads on UPDATE/DELETE
ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.post_likes REPLICA IDENTITY FULL;
ALTER TABLE public.banners REPLICA IDENTITY FULL;
ALTER TABLE public.gifts REPLICA IDENTITY FULL;
ALTER TABLE public.store_items REPLICA IDENTITY FULL;
ALTER TABLE public.pricing_plans REPLICA IDENTITY FULL;

-- Ensure public read access for asset tables (drop & recreate for safety)
DROP POLICY IF EXISTS "Anyone can read active banners" ON public.banners;
CREATE POLICY "Public can read banners" ON public.banners FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read gifts" ON public.gifts;
CREATE POLICY "Public can read gifts" ON public.gifts FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read store items" ON public.store_items;
CREATE POLICY "Public can read store items" ON public.store_items FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Anyone can read pricing" ON public.pricing_plans;
CREATE POLICY "Public can read pricing" ON public.pricing_plans FOR SELECT TO anon, authenticated USING (true);