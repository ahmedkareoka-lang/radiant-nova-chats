-- Track highest NOVA P level achieved per user per month
CREATE TABLE IF NOT EXISTS public.nova_p_monthly_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  year_month TEXT NOT NULL, -- format: YYYY-MM
  highest_level INTEGER NOT NULL DEFAULT 0,
  total_gold_earned BIGINT NOT NULL DEFAULT 0,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, year_month)
);

ALTER TABLE public.nova_p_monthly_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read monthly history"
ON public.nova_p_monthly_history
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can upsert own monthly history"
ON public.nova_p_monthly_history
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own monthly history"
ON public.nova_p_monthly_history
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_nova_monthly_user_month ON public.nova_p_monthly_history(user_id, year_month);

-- Function: record current month's nova p level (called from client)
CREATE OR REPLACE FUNCTION public.record_nova_p_monthly(_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_ym TEXT;
  current_level INTEGER;
  current_gold BIGINT;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  current_ym := to_char(now(), 'YYYY-MM');

  SELECT nova_p_level, total_spend_gold
    INTO current_level, current_gold
    FROM profiles WHERE id = _user_id;

  IF current_level IS NULL OR current_level <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO nova_p_monthly_history (user_id, year_month, highest_level, total_gold_earned)
  VALUES (_user_id, current_ym, current_level, COALESCE(current_gold, 0))
  ON CONFLICT (user_id, year_month) DO UPDATE
  SET highest_level = GREATEST(nova_p_monthly_history.highest_level, EXCLUDED.highest_level),
      total_gold_earned = GREATEST(nova_p_monthly_history.total_gold_earned, EXCLUDED.total_gold_earned);
END;
$$;