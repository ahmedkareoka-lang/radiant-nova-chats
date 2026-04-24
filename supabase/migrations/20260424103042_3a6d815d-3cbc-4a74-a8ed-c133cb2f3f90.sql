-- Add new counter and claim columns
ALTER TABLE public.daily_tasks
  ADD COLUMN IF NOT EXISTS follows_made integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS posts_made integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS likes_given integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS messages_sent integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS follow_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS post_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS like_reward_claimed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS message_reward_claimed boolean NOT NULL DEFAULT false;

-- Update increment function to support new task types
CREATE OR REPLACE FUNCTION public.increment_daily_task(_user_id uuid, _task_type text, _amount integer DEFAULT 1)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO daily_tasks (user_id, task_date) VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, task_date) DO NOTHING;

  IF _task_type = 'gift' THEN
    UPDATE daily_tasks SET gifts_sent = gifts_sent + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'room' THEN
    UPDATE daily_tasks SET room_minutes = room_minutes + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'games' THEN
    UPDATE daily_tasks SET games_played = games_played + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'follow' THEN
    UPDATE daily_tasks SET follows_made = follows_made + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'post' THEN
    UPDATE daily_tasks SET posts_made = posts_made + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'like' THEN
    UPDATE daily_tasks SET likes_given = likes_given + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  ELSIF _task_type = 'message' THEN
    UPDATE daily_tasks SET messages_sent = messages_sent + _amount WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  END IF;
END;
$function$;

-- Update claim function to support new task types
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
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO daily_tasks (user_id, task_date) VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, task_date) DO NOTHING;

  SELECT * INTO task_row FROM daily_tasks WHERE user_id = _user_id AND task_date = CURRENT_DATE;

  IF _task_type = 'gift' THEN
    reward_amount := 500; required_count := 1;
    current_count := task_row.gifts_sent;
    already_claimed := task_row.gift_reward_claimed;
  ELSIF _task_type = 'room' THEN
    reward_amount := 1000; required_count := 30;
    current_count := task_row.room_minutes;
    already_claimed := task_row.room_reward_claimed;
  ELSIF _task_type = 'games' THEN
    reward_amount := 800; required_count := 3;
    current_count := task_row.games_played;
    already_claimed := task_row.games_reward_claimed;
  ELSIF _task_type = 'follow' THEN
    reward_amount := 300; required_count := 1;
    current_count := task_row.follows_made;
    already_claimed := task_row.follow_reward_claimed;
  ELSIF _task_type = 'post' THEN
    reward_amount := 400; required_count := 1;
    current_count := task_row.posts_made;
    already_claimed := task_row.post_reward_claimed;
  ELSIF _task_type = 'like' THEN
    reward_amount := 250; required_count := 5;
    current_count := task_row.likes_given;
    already_claimed := task_row.like_reward_claimed;
  ELSIF _task_type = 'message' THEN
    reward_amount := 350; required_count := 5;
    current_count := task_row.messages_sent;
    already_claimed := task_row.message_reward_claimed;
  ELSE
    RAISE EXCEPTION 'Invalid task type';
  END IF;

  IF already_claimed THEN
    RAISE EXCEPTION 'Already claimed';
  END IF;

  IF current_count < required_count THEN
    RAISE EXCEPTION 'Task not completed';
  END IF;

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