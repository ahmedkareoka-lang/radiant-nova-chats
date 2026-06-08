
-- Add new columns to love_couples
ALTER TABLE public.love_couples
  ADD COLUMN IF NOT EXISTS custom_title text,
  ADD COLUMN IF NOT EXISTS streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date date,
  ADD COLUMN IF NOT EXISTS weekly_gift_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS monthly_anniversary_claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS daily_hearts_sent_at date,
  ADD COLUMN IF NOT EXISTS daily_hearts_count integer NOT NULL DEFAULT 0;

-- ============= love_quests =============
CREATE TABLE IF NOT EXISTS public.love_quests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.love_couples(id) ON DELETE CASCADE,
  quest_date date NOT NULL DEFAULT CURRENT_DATE,
  quest_key text NOT NULL,                    -- e.g. 'send_3_gifts', 'spend_30_min_room'
  target integer NOT NULL,
  progress integer NOT NULL DEFAULT 0,
  reward_points integer NOT NULL DEFAULT 1000,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, quest_date, quest_key)
);
GRANT SELECT, INSERT, UPDATE ON public.love_quests TO authenticated;
GRANT ALL ON public.love_quests TO service_role;
ALTER TABLE public.love_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Couple members read quests" ON public.love_quests
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.love_couples c
      WHERE c.id = love_quests.couple_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
  );
CREATE POLICY "Couple members insert quests" ON public.love_quests
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.love_couples c
      WHERE c.id = love_quests.couple_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
  );
CREATE POLICY "Couple members update quests" ON public.love_quests
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.love_couples c
      WHERE c.id = love_quests.couple_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
  );

-- ============= love_achievements =============
CREATE TABLE IF NOT EXISTS public.love_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  couple_id uuid NOT NULL REFERENCES public.love_couples(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (couple_id, achievement_key)
);
GRANT SELECT, INSERT ON public.love_achievements TO authenticated;
GRANT ALL ON public.love_achievements TO service_role;
ALTER TABLE public.love_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone read achievements" ON public.love_achievements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Couple members insert achievement" ON public.love_achievements
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.love_couples c
      WHERE c.id = love_achievements.couple_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid()))
  );

-- ============= award_love_points =============
CREATE OR REPLACE FUNCTION public.award_love_points(_couple_id uuid, _points bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  thresholds bigint[] := ARRAY[0, 25000, 60000, 130000, 270000, 550000, 1110000, 2230000, 4470000, 8950000];
  new_pts bigint;
  new_lvl int := 1;
  i int;
BEGIN
  SELECT * INTO c FROM public.love_couples WHERE id = _couple_id AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF auth.uid() IS NOT NULL AND auth.uid() <> c.user1_id AND auth.uid() <> c.user2_id THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  new_pts := c.love_points + GREATEST(0, _points);
  FOR i IN REVERSE 10..1 LOOP
    IF new_pts >= thresholds[i] THEN new_lvl := i; EXIT; END IF;
  END LOOP;

  UPDATE public.love_couples
    SET love_points = new_pts,
        love_level = new_lvl,
        updated_at = now()
    WHERE id = _couple_id;

  -- Notify on level up
  IF new_lvl > c.love_level THEN
    INSERT INTO public.notifications (user_id, title, message, type)
    VALUES
      (c.user1_id, '💞 ترقية مستوى الحب!', 'وصلتم للمستوى ' || new_lvl, 'love_levelup'),
      (c.user2_id, '💞 ترقية مستوى الحب!', 'وصلتم للمستوى ' || new_lvl, 'love_levelup');
  END IF;

  RETURN jsonb_build_object('ok', true, 'points', new_pts, 'level', new_lvl, 'leveled_up', new_lvl > c.love_level);
END;
$$;
GRANT EXECUTE ON FUNCTION public.award_love_points(uuid, bigint) TO authenticated;

-- ============= send_love_heart =============
CREATE OR REPLACE FUNCTION public.send_love_heart()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  partner_id uuid;
  today_count int;
BEGIN
  SELECT * INTO c FROM public.love_couples
    WHERE is_active = true
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
    LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_couple'); END IF;
  IF c.love_level < 3 THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_too_low'); END IF;

  partner_id := CASE WHEN c.user1_id = auth.uid() THEN c.user2_id ELSE c.user1_id END;
  today_count := CASE WHEN c.daily_hearts_sent_at = CURRENT_DATE THEN c.daily_hearts_count ELSE 0 END;
  IF today_count >= 3 THEN RETURN jsonb_build_object('ok', false, 'reason', 'limit'); END IF;

  UPDATE public.love_couples
    SET daily_hearts_sent_at = CURRENT_DATE,
        daily_hearts_count = today_count + 1
    WHERE id = c.id;

  INSERT INTO public.notifications (user_id, title, message, type)
    VALUES (partner_id, '💌 قلب من حبيبك', 'أرسلك قلباً يومياً 💕', 'love_heart');

  PERFORM public.award_love_points(c.id, 500);
  RETURN jsonb_build_object('ok', true, 'remaining', 2 - today_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.send_love_heart() TO authenticated;

-- ============= claim_weekly_couple_gift =============
CREATE OR REPLACE FUNCTION public.claim_weekly_couple_gift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.love_couples
    WHERE is_active = true
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
    LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_couple'); END IF;
  IF c.love_level < 4 THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_too_low'); END IF;
  IF c.weekly_gift_claimed_at IS NOT NULL AND c.weekly_gift_claimed_at > now() - interval '7 days' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'next_at', c.weekly_gift_claimed_at + interval '7 days');
  END IF;

  UPDATE public.profiles SET coins = coins + 2000 WHERE id IN (c.user1_id, c.user2_id);
  UPDATE public.love_couples SET weekly_gift_claimed_at = now() WHERE id = c.id;
  PERFORM public.award_love_points(c.id, 1500);
  RETURN jsonb_build_object('ok', true, 'reward_coins', 2000, 'reward_points', 1500);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_weekly_couple_gift() TO authenticated;

-- ============= claim_monthly_anniversary =============
CREATE OR REPLACE FUNCTION public.claim_monthly_anniversary()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.love_couples
    WHERE is_active = true
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
    LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_couple'); END IF;
  IF c.love_level < 8 THEN RETURN jsonb_build_object('ok', false, 'reason', 'level_too_low'); END IF;
  IF c.monthly_anniversary_claimed_at IS NOT NULL AND c.monthly_anniversary_claimed_at > now() - interval '30 days' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed', 'next_at', c.monthly_anniversary_claimed_at + interval '30 days');
  END IF;

  UPDATE public.profiles SET coins = coins + 5000 WHERE id IN (c.user1_id, c.user2_id);
  UPDATE public.love_couples SET monthly_anniversary_claimed_at = now() WHERE id = c.id;
  PERFORM public.award_love_points(c.id, 5000);
  RETURN jsonb_build_object('ok', true, 'reward_coins', 5000);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_monthly_anniversary() TO authenticated;

-- ============= bump_couple_streak =============
CREATE OR REPLACE FUNCTION public.bump_couple_streak()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  new_streak int;
BEGIN
  SELECT * INTO c FROM public.love_couples
    WHERE is_active = true
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
    LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;

  IF c.last_streak_date = CURRENT_DATE THEN
    RETURN jsonb_build_object('ok', true, 'streak', c.streak_days, 'changed', false);
  END IF;

  IF c.last_streak_date = CURRENT_DATE - 1 THEN
    new_streak := c.streak_days + 1;
  ELSE
    new_streak := 1;
  END IF;

  UPDATE public.love_couples
    SET streak_days = new_streak, last_streak_date = CURRENT_DATE
    WHERE id = c.id;

  -- Every 7 days bonus
  IF new_streak > 0 AND new_streak % 7 = 0 THEN
    PERFORM public.award_love_points(c.id, 3000);
  END IF;

  RETURN jsonb_build_object('ok', true, 'streak', new_streak, 'changed', true);
END;
$$;
GRANT EXECUTE ON FUNCTION public.bump_couple_streak() TO authenticated;

-- ============= update_love_quest_progress =============
CREATE OR REPLACE FUNCTION public.claim_love_quest(_quest_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q record;
  c record;
BEGIN
  SELECT * INTO q FROM public.love_quests WHERE id = _quest_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  SELECT * INTO c FROM public.love_couples WHERE id = q.couple_id;
  IF c.user1_id <> auth.uid() AND c.user2_id <> auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;
  IF q.claimed THEN RETURN jsonb_build_object('ok', false, 'reason', 'already_claimed'); END IF;
  IF q.progress < q.target THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_complete'); END IF;

  UPDATE public.love_quests SET claimed = true, completed = true WHERE id = _quest_id;
  PERFORM public.award_love_points(q.couple_id, q.reward_points);
  RETURN jsonb_build_object('ok', true, 'reward', q.reward_points);
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_love_quest(uuid) TO authenticated;

-- updated_at trigger for love_quests
CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_love_quests_updated ON public.love_quests;
CREATE TRIGGER trg_love_quests_updated BEFORE UPDATE ON public.love_quests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
