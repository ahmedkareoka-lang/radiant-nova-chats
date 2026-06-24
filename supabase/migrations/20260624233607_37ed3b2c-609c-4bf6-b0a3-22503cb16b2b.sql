
-- Profile visitors tracking
CREATE TABLE IF NOT EXISTS public.profile_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visitor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_count integer NOT NULL DEFAULT 1,
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id, visitor_id)
);

GRANT SELECT, INSERT, UPDATE ON public.profile_visits TO authenticated;
GRANT ALL ON public.profile_visits TO service_role;

ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own visitors"
ON public.profile_visits FOR SELECT TO authenticated
USING (auth.uid() = profile_id);

CREATE POLICY "Visitor can insert visit"
ON public.profile_visits FOR INSERT TO authenticated
WITH CHECK (auth.uid() = visitor_id AND visitor_id <> profile_id);

CREATE POLICY "Visitor can update own visit row"
ON public.profile_visits FOR UPDATE TO authenticated
USING (auth.uid() = visitor_id)
WITH CHECK (auth.uid() = visitor_id);

CREATE INDEX IF NOT EXISTS idx_profile_visits_profile_recent
  ON public.profile_visits (profile_id, last_visited_at DESC);

-- Upsert helper: records or bumps a visit. SECURITY DEFINER so RLS upsert is atomic.
CREATE OR REPLACE FUNCTION public.record_profile_visit(_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() = _profile_id THEN
    RETURN;
  END IF;
  INSERT INTO public.profile_visits (profile_id, visitor_id, visit_count, last_visited_at)
  VALUES (_profile_id, auth.uid(), 1, now())
  ON CONFLICT (profile_id, visitor_id)
  DO UPDATE SET visit_count = public.profile_visits.visit_count + 1,
                last_visited_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_profile_visit(uuid) TO authenticated;
