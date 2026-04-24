-- ============================================
-- SPRINT 1: Gift Combos, Lucky Box, Streaks, Invites
-- ============================================

-- 1) GIFT COMBOS LOG
CREATE TABLE public.gift_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  room_id uuid,
  gift_name text NOT NULL,
  combo_count integer NOT NULL CHECK (combo_count IN (1, 10, 99, 520, 1314)),
  unit_price bigint NOT NULL,
  total_gold bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_combos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own combos"
  ON public.gift_combos FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can log own combos"
  ON public.gift_combos FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE INDEX idx_gift_combos_sender ON public.gift_combos(sender_id, created_at DESC);
CREATE INDEX idx_gift_combos_receiver ON public.gift_combos(receiver_id, created_at DESC);

-- ============================================
-- 2) LUCKY BOX OPENINGS
-- ============================================
CREATE TABLE public.lucky_box_openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  box_tier text NOT NULL DEFAULT 'bronze' CHECK (box_tier IN ('bronze', 'silver', 'gold')),
  cost_coins bigint NOT NULL,
  reward_coins bigint NOT NULL DEFAULT 0,
  reward_diamonds bigint NOT NULL DEFAULT 0,
  reward_item_type text,
  reward_item_name text,
  is_jackpot boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.lucky_box_openings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own openings"
  ON public.lucky_box_openings FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_lucky_box_user ON public.lucky_box_openings(user_id, created_at DESC);

-- ============================================
-- 3) DAILY STREAKS
-- ============================================
CREATE TABLE public.user_streaks (
  user_id uuid PRIMARY KEY,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_claim_date date,
  total_claims integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own streak"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can read streaks for leaderboard"
  ON public.user_streaks FOR SELECT TO authenticated
  USING (true);

-- ============================================
-- 4) REFERRAL CODES
-- ============================================
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  uses_count integer NOT NULL DEFAULT 0,
  total_earned_coins bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read referral codes"
  ON public.referral_codes FOR SELECT TO authenticated
  USING (true);

CREATE INDEX idx_referral_codes_code ON public.referral_codes(code);

-- ============================================
-- 5) REFERRALS (relationships)
-- ============================================
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  signup_reward_claimed boolean NOT NULL DEFAULT false,
  level5_reward_claimed boolean NOT NULL DEFAULT false,
  total_recharge_bonus bigint NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own referrals"
  ON public.referrals FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

-- ============================================
-- 6) REFERRAL RECHARGE LOG
-- ============================================
CREATE TABLE public.referral_recharge_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL,
  recharge_amount_coins bigint NOT NULL,
  bonus_coins bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_recharge_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own bonuses"
  ON public.referral_recharge_log FOR SELECT TO authenticated
  USING (auth.uid() = referrer_id);

CREATE INDEX idx_referral_recharge_referrer ON public.referral_recharge_log(referrer_id, created_at DESC);

-- ============================================
-- FUNCTION: generate unique referral code
-- ============================================
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code text;
  exists_already boolean;
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i integer;
BEGIN
  LOOP
    new_code := '';
    FOR i IN 1..6 LOOP
      new_code := new_code || substr(chars, 1 + floor(random() * length(chars))::int, 1);
    END LOOP;
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = new_code) INTO exists_already;
    IF NOT exists_already THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- FUNCTION: open lucky box (Bronze tier — balanced)
-- Cost: 500 coins | Avg return ~80% | 5% jackpot chance
-- ============================================
CREATE OR REPLACE FUNCTION public.open_lucky_box(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cost bigint := 500;
  current_coins bigint;
  roll numeric;
  reward_coins bigint := 0;
  reward_diamonds bigint := 0;
  reward_item_type text := NULL;
  reward_item_name text := NULL;
  is_jackpot boolean := false;
  result jsonb;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  SELECT coins INTO current_coins FROM profiles WHERE id = _user_id;
  IF current_coins IS NULL OR current_coins < cost THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Deduct cost
  UPDATE profiles SET coins = coins - cost WHERE id = _user_id;

  -- Roll for reward (0..1)
  roll := random();

  -- Distribution (balanced — 80% avg return, 5% jackpot):
  --   0.00 - 0.40  (40%) → 100-300 coins  (small loss)
  --   0.40 - 0.75  (35%) → 300-700 coins  (near break-even)
  --   0.75 - 0.90  (15%) → 700-1500 coins (small win)
  --   0.90 - 0.95  (5%)  → 1500-3000 coins (big win)
  --   0.95 - 1.00  (5%)  → JACKPOT 3000-5000 coins + 10 diamonds
  IF roll < 0.40 THEN
    reward_coins := 100 + floor(random() * 201)::bigint;
  ELSIF roll < 0.75 THEN
    reward_coins := 300 + floor(random() * 401)::bigint;
  ELSIF roll < 0.90 THEN
    reward_coins := 700 + floor(random() * 801)::bigint;
  ELSIF roll < 0.95 THEN
    reward_coins := 1500 + floor(random() * 1501)::bigint;
  ELSE
    reward_coins := 3000 + floor(random() * 2001)::bigint;
    reward_diamonds := 10;
    is_jackpot := true;
  END IF;

  -- Apply rewards
  UPDATE profiles
     SET coins = coins + reward_coins,
         diamonds = diamonds + reward_diamonds
   WHERE id = _user_id;

  -- Log
  INSERT INTO lucky_box_openings (user_id, box_tier, cost_coins, reward_coins, reward_diamonds, is_jackpot)
  VALUES (_user_id, 'bronze', cost, reward_coins, reward_diamonds, is_jackpot);

  -- Notify on jackpot
  IF is_jackpot THEN
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (_user_id, '🎰 جاكبوت!', 'كسبت ' || reward_coins || ' كوينز + ' || reward_diamonds || ' ماس من صندوق الحظ!', 'lucky');
  END IF;

  result := jsonb_build_object(
    'reward_coins', reward_coins,
    'reward_diamonds', reward_diamonds,
    'is_jackpot', is_jackpot,
    'cost', cost
  );
  RETURN result;
END;
$$;

-- ============================================
-- FUNCTION: claim daily streak
-- Reward formula: 200 + (streak_day * 100) capped at 2000
-- Bonus 500 every 7 days, 2000 every 30 days
-- ============================================
CREATE OR REPLACE FUNCTION public.claim_daily_streak(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  streak_row RECORD;
  today date := CURRENT_DATE;
  yesterday date := CURRENT_DATE - 1;
  new_streak integer;
  base_reward bigint;
  bonus_reward bigint := 0;
  total_reward bigint;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Ensure row exists
  INSERT INTO user_streaks (user_id) VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO streak_row FROM user_streaks WHERE user_id = _user_id;

  IF streak_row.last_claim_date = today THEN
    RAISE EXCEPTION 'Already claimed today';
  END IF;

  -- Continue streak if claimed yesterday, else reset
  IF streak_row.last_claim_date = yesterday THEN
    new_streak := streak_row.current_streak + 1;
  ELSE
    new_streak := 1;
  END IF;

  -- Calculate reward
  base_reward := LEAST(200 + (new_streak * 100), 2000);
  IF new_streak % 30 = 0 THEN
    bonus_reward := 2000;
  ELSIF new_streak % 7 = 0 THEN
    bonus_reward := 500;
  END IF;
  total_reward := base_reward + bonus_reward;

  -- Update streak
  UPDATE user_streaks
     SET current_streak = new_streak,
         longest_streak = GREATEST(longest_streak, new_streak),
         last_claim_date = today,
         total_claims = total_claims + 1,
         updated_at = now()
   WHERE user_id = _user_id;

  -- Add coins
  UPDATE profiles SET coins = coins + total_reward WHERE id = _user_id;

  RETURN jsonb_build_object(
    'streak', new_streak,
    'base_reward', base_reward,
    'bonus_reward', bonus_reward,
    'total_reward', total_reward
  );
END;
$$;

-- ============================================
-- FUNCTION: apply referral code (called once on signup or first login)
-- Awards 500 coins immediately to referred user
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_referral_code(_user_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  referrer uuid;
  signup_reward bigint := 500;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Already referred?
  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = _user_id) THEN
    RAISE EXCEPTION 'Already used a referral code';
  END IF;

  -- Find referrer
  SELECT user_id INTO referrer FROM referral_codes WHERE code = upper(_code);
  IF referrer IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  IF referrer = _user_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Create referral record
  INSERT INTO referrals (referrer_id, referred_id, signup_reward_claimed)
  VALUES (referrer, _user_id, true);

  -- Award immediate signup bonus to referred user
  UPDATE profiles SET coins = coins + signup_reward WHERE id = _user_id;

  -- Increment referrer stats
  UPDATE referral_codes
     SET uses_count = uses_count + 1,
         total_earned_coins = total_earned_coins + signup_reward
   WHERE user_id = referrer;

  -- Notify referrer
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (referrer, '👥 صديق جديد انضم!', 'حد دخل بكود الدعوة بتاعك. هتاخد 1000 كوينز لما يوصل level 5 + 5% من شحناته', 'referral');

  RETURN jsonb_build_object('signup_reward', signup_reward, 'referrer_id', referrer);
END;
$$;

-- ============================================
-- FUNCTION: process level-5 referral reward (called when user hits level 5)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_referral_level5(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref RECORD;
  user_level integer;
  reward bigint := 1000;
BEGIN
  SELECT level INTO user_level FROM profiles WHERE id = _user_id;
  IF user_level IS NULL OR user_level < 5 THEN RETURN; END IF;

  SELECT * INTO ref FROM referrals
   WHERE referred_id = _user_id AND level5_reward_claimed = false;
  IF NOT FOUND THEN RETURN; END IF;

  -- Award both
  UPDATE profiles SET coins = coins + reward WHERE id IN (ref.referrer_id, _user_id);

  UPDATE referrals SET level5_reward_claimed = true WHERE id = ref.id;
  UPDATE referral_codes
     SET total_earned_coins = total_earned_coins + reward
   WHERE user_id = ref.referrer_id;

  INSERT INTO notifications (user_id, title, message, type) VALUES
    (ref.referrer_id, '🎉 صديقك وصل level 5!', 'حصلت على ' || reward || ' كوينز كمكافأة', 'referral'),
    (_user_id, '🎉 وصلت level 5!', 'حصلت على ' || reward || ' كوينز إضافية من برنامج الدعوة', 'referral');
END;
$$;

-- ============================================
-- FUNCTION: process referral recharge bonus (5% to referrer on each recharge)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_referral_recharge(_user_id uuid, _recharge_coins bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref RECORD;
  bonus bigint;
BEGIN
  SELECT * INTO ref FROM referrals WHERE referred_id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;

  bonus := floor(_recharge_coins * 0.05)::bigint;
  IF bonus <= 0 THEN RETURN; END IF;

  UPDATE profiles SET coins = coins + bonus WHERE id = ref.referrer_id;

  UPDATE referrals
     SET total_recharge_bonus = total_recharge_bonus + bonus
   WHERE id = ref.id;

  UPDATE referral_codes
     SET total_earned_coins = total_earned_coins + bonus
   WHERE user_id = ref.referrer_id;

  INSERT INTO referral_recharge_log (referrer_id, referred_id, recharge_amount_coins, bonus_coins)
  VALUES (ref.referrer_id, _user_id, _recharge_coins, bonus);

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (ref.referrer_id, '💰 مكافأة شحن!', 'صديقك شحن، حصلت على ' || bonus || ' كوينز (5%)', 'referral');
END;
$$;

-- ============================================
-- TRIGGER: auto-generate referral code on profile creation
-- ============================================
CREATE OR REPLACE FUNCTION public.create_referral_code_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (NEW.id, generate_referral_code())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_create_referral_code
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_referral_code_for_user();

-- Backfill existing users
INSERT INTO public.referral_codes (user_id, code)
SELECT id, generate_referral_code() FROM public.profiles
WHERE id NOT IN (SELECT user_id FROM public.referral_codes);