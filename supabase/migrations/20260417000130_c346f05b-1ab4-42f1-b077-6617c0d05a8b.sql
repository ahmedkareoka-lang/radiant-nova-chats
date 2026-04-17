
-- Daily tasks tracker
CREATE TABLE public.daily_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  task_date date NOT NULL DEFAULT CURRENT_DATE,
  gifts_sent int NOT NULL DEFAULT 0,
  room_minutes int NOT NULL DEFAULT 0,
  games_played int NOT NULL DEFAULT 0,
  gift_reward_claimed boolean NOT NULL DEFAULT false,
  room_reward_claimed boolean NOT NULL DEFAULT false,
  games_reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_date)
);

ALTER TABLE public.daily_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own tasks" ON public.daily_tasks
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own tasks" ON public.daily_tasks
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own tasks" ON public.daily_tasks
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Function to claim daily reward (atomic)
CREATE OR REPLACE FUNCTION public.claim_daily_reward(_user_id uuid, _task_type text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Ensure today's row exists
  INSERT INTO daily_tasks (user_id, task_date) VALUES (_user_id, CURRENT_DATE)
  ON CONFLICT (user_id, task_date) DO NOTHING;

  SELECT * INTO task_row FROM daily_tasks WHERE user_id = _user_id AND task_date = CURRENT_DATE;

  IF _task_type = 'gift' THEN
    reward_amount := 500;
    required_count := 1;
    current_count := task_row.gifts_sent;
    already_claimed := task_row.gift_reward_claimed;
  ELSIF _task_type = 'room' THEN
    reward_amount := 1000;
    required_count := 30;
    current_count := task_row.room_minutes;
    already_claimed := task_row.room_reward_claimed;
  ELSIF _task_type = 'games' THEN
    reward_amount := 800;
    required_count := 3;
    current_count := task_row.games_played;
    already_claimed := task_row.games_reward_claimed;
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
  END IF;
END;
$$;

-- Function to increment task counter
CREATE OR REPLACE FUNCTION public.increment_daily_task(_user_id uuid, _task_type text, _amount int DEFAULT 1)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  END IF;
END;
$$;

-- Posts feed
CREATE TABLE public.posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read posts" ON public.posts
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can create own posts" ON public.posts
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts" ON public.posts
FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users or admin can delete posts" ON public.posts
FOR DELETE TO authenticated USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

-- Post likes
CREATE TABLE public.post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read likes" ON public.post_likes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can like" ON public.post_likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike" ON public.post_likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_likes;
