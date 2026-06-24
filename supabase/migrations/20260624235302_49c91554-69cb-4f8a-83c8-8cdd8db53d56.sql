
-- VIP daily-reward bonus + stealth visits + anti-kick + store discount helper

CREATE OR REPLACE FUNCTION public.vip_active_level(_user uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT vip_level FROM profiles
      WHERE id = _user
        AND vip_level IS NOT NULL
        AND vip_level > 0
        AND vip_expiry IS NOT NULL
        AND vip_expiry > now()),
    0);
$$;
GRANT EXECUTE ON FUNCTION public.vip_active_level(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vip_reward_multiplier(_user uuid)
RETURNS numeric
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.vip_active_level(_user)
    WHEN 1 THEN 1.05
    WHEN 2 THEN 1.10
    WHEN 3 THEN 1.15
    WHEN 4 THEN 1.20
    WHEN 5 THEN 1.30
    WHEN 6 THEN 1.40
    WHEN 7 THEN 1.50
    ELSE 1.0 END;
$$;
GRANT EXECUTE ON FUNCTION public.vip_reward_multiplier(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.vip_store_discount(_user uuid)
RETURNS int
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE public.vip_active_level(_user)
    WHEN 5 THEN 15
    WHEN 6 THEN 25
    WHEN 7 THEN 40
    ELSE 0 END;
$$;
GRANT EXECUTE ON FUNCTION public.vip_store_discount(uuid) TO authenticated;

-- Daily reward: apply VIP multiplier on payout
CREATE OR REPLACE FUNCTION public.claim_daily_reward(_user_id uuid, _task_type text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  task_row RECORD;
  reward_amount bigint;
  required_count int;
  current_count int;
  already_claimed boolean;
  mult numeric;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO daily_tasks (user_id, task_date) VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, task_date) DO NOTHING;

  SELECT * INTO task_row FROM daily_tasks WHERE user_id = _user_id AND task_date = CURRENT_DATE;

  IF _task_type = 'gift' THEN
    reward_amount := 500; required_count := 1;
    current_count := task_row.gifts_sent; already_claimed := task_row.gift_reward_claimed;
  ELSIF _task_type = 'room' THEN
    reward_amount := 1000; required_count := 30;
    current_count := task_row.room_minutes; already_claimed := task_row.room_reward_claimed;
  ELSIF _task_type = 'games' THEN
    reward_amount := 800; required_count := 3;
    current_count := task_row.games_played; already_claimed := task_row.games_reward_claimed;
  ELSIF _task_type = 'follow' THEN
    reward_amount := 300; required_count := 1;
    current_count := task_row.follows_made; already_claimed := task_row.follow_reward_claimed;
  ELSIF _task_type = 'post' THEN
    reward_amount := 400; required_count := 1;
    current_count := task_row.posts_made; already_claimed := task_row.post_reward_claimed;
  ELSIF _task_type = 'like' THEN
    reward_amount := 250; required_count := 5;
    current_count := task_row.likes_given; already_claimed := task_row.like_reward_claimed;
  ELSIF _task_type = 'message' THEN
    reward_amount := 350; required_count := 5;
    current_count := task_row.messages_sent; already_claimed := task_row.message_reward_claimed;
  ELSE
    RAISE EXCEPTION 'Invalid task type';
  END IF;

  IF already_claimed THEN RAISE EXCEPTION 'Already claimed'; END IF;
  IF current_count < required_count THEN RAISE EXCEPTION 'Task not completed'; END IF;

  mult := public.vip_reward_multiplier(_user_id);
  reward_amount := floor(reward_amount::numeric * mult)::bigint;

  UPDATE profiles SET coins = coins + reward_amount WHERE id = _user_id;

  IF _task_type = 'gift' THEN
    UPDATE daily_tasks SET gift_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'room' THEN
    UPDATE daily_tasks SET room_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'games' THEN
    UPDATE daily_tasks SET games_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'follow' THEN
    UPDATE daily_tasks SET follow_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'post' THEN
    UPDATE daily_tasks SET post_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'like' THEN
    UPDATE daily_tasks SET like_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'message' THEN
    UPDATE daily_tasks SET message_reward_claimed = true WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  END IF;
END;
$function$;

-- Stealth visits: VIP2+ skipped from being recorded as a visitor
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
  IF public.vip_active_level(auth.uid()) >= 2 THEN
    RETURN;
  END IF;
  INSERT INTO public.profile_visits (profile_id, visitor_id, visit_count, last_visited_at)
  VALUES (_profile_id, auth.uid(), 1, now())
  ON CONFLICT (profile_id, visitor_id)
  DO UPDATE SET visit_count = public.profile_visits.visit_count + 1,
                last_visited_at = now();
END;
$$;

-- Kick / mic-kick: VIP5+ targets are protected (BOSS overrides)
CREATE OR REPLACE FUNCTION public.admin_kick_user(_room_id uuid, _target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
  is_boss boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true) INTO is_boss;
  SELECT (
    EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid())
    OR is_boss
  ) INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NOT is_boss AND public.vip_active_level(_target_user) >= 5 THEN
    RAISE EXCEPTION 'vip_protected';
  END IF;
  DELETE FROM room_members WHERE room_id = _room_id AND user_id = _target_user;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_kick_from_mic(_room_id uuid, _target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
  is_boss boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true) INTO is_boss;
  SELECT (
    EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid())
    OR is_boss
  ) INTO allowed;
  IF NOT allowed THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF NOT is_boss AND public.vip_active_level(_target_user) >= 5 THEN
    RAISE EXCEPTION 'vip_protected';
  END IF;
  UPDATE room_members
     SET mic_slot = NULL, is_on_mic = false
   WHERE room_id = _room_id AND user_id = _target_user;
END;
$$;
