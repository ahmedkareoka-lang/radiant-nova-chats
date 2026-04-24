-- ============================================
-- LOVE COUPLES SYSTEM (حبيبين)
-- ============================================

-- Permanent love couples (different from room_couples which is temporary in voice rooms)
CREATE TABLE public.love_couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  love_points BIGINT NOT NULL DEFAULT 0,
  love_level INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Each user can only have ONE active partner
  CONSTRAINT love_couples_no_self CHECK (user1_id <> user2_id)
);

-- Unique active partnership per user (either side)
CREATE UNIQUE INDEX love_couples_user1_active_idx ON public.love_couples (user1_id) WHERE is_active = true;
CREATE UNIQUE INDEX love_couples_user2_active_idx ON public.love_couples (user2_id) WHERE is_active = true;
CREATE INDEX love_couples_lookup_idx ON public.love_couples (user1_id, user2_id);

ALTER TABLE public.love_couples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read love couples"
ON public.love_couples FOR SELECT
TO authenticated
USING (true);

-- Inserts/updates only via RPC (security definer)
-- No direct policies for INSERT/UPDATE/DELETE — forces RPC usage

-- ============================================
-- LEVEL THRESHOLD FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION public.get_love_level(_points BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  -- Cumulative thresholds (each level doubles the increment)
  IF _points >= 8950000 THEN RETURN 10;
  ELSIF _points >= 4470000 THEN RETURN 9;
  ELSIF _points >= 2230000 THEN RETURN 8;
  ELSIF _points >= 1110000 THEN RETURN 7;
  ELSIF _points >= 550000 THEN RETURN 6;
  ELSIF _points >= 270000 THEN RETURN 5;
  ELSIF _points >= 130000 THEN RETURN 4;
  ELSIF _points >= 60000 THEN RETURN 3;
  ELSIF _points >= 25000 THEN RETURN 2;
  ELSE RETURN 1;
  END IF;
END;
$$;

-- ============================================
-- ACTIVATE LOVE COUPLE (costs 10,000 coins from initiator)
-- ============================================
CREATE OR REPLACE FUNCTION public.activate_love_couple(_partner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  initiator UUID := auth.uid();
  cost BIGINT := 10000;
  current_coins BIGINT;
  existing_id UUID;
  new_id UUID;
  partner_name TEXT;
  initiator_name TEXT;
BEGIN
  IF initiator IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF initiator = _partner_id THEN
    RAISE EXCEPTION 'Cannot couple with yourself';
  END IF;

  -- Check both users don't already have an active partner
  SELECT id INTO existing_id FROM love_couples
  WHERE is_active = true
    AND (user1_id = initiator OR user2_id = initiator OR user1_id = _partner_id OR user2_id = _partner_id)
  LIMIT 1;

  IF existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'One of the users already has an active partner';
  END IF;

  -- Check coins
  SELECT coins INTO current_coins FROM profiles WHERE id = initiator;
  IF current_coins IS NULL OR current_coins < cost THEN
    RAISE EXCEPTION 'Insufficient coins. Need 10,000';
  END IF;

  -- Deduct cost
  UPDATE profiles SET coins = coins - cost WHERE id = initiator;

  -- Create partnership at level 1 with 10,000 starting points (the activation fee)
  INSERT INTO love_couples (user1_id, user2_id, love_points, love_level)
  VALUES (initiator, _partner_id, cost, 1)
  RETURNING id INTO new_id;

  -- Notify partner
  SELECT display_name INTO initiator_name FROM profiles WHERE id = initiator;
  SELECT display_name INTO partner_name FROM profiles WHERE id = _partner_id;

  INSERT INTO notifications (user_id, title, message, type) VALUES
    (_partner_id, '💕 حبيبين!', COALESCE(initiator_name, 'مستخدم') || ' فعّل علاقة حبيبين معك', 'love'),
    (initiator, '💕 تم التفعيل!', 'أصبحت حبيبين مع ' || COALESCE(partner_name, 'مستخدم'), 'love');

  RETURN jsonb_build_object('id', new_id, 'level', 1, 'points', cost);
END;
$$;

-- ============================================
-- DEACTIVATE (either partner can break up)
-- ============================================
CREATE OR REPLACE FUNCTION public.deactivate_love_couple()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me UUID := auth.uid();
BEGIN
  IF me IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE love_couples
  SET is_active = false, updated_at = now()
  WHERE is_active = true
    AND (user1_id = me OR user2_id = me);
END;
$$;

-- ============================================
-- TRIGGER: increment love points when gift exchanged between active couple
-- ============================================
CREATE OR REPLACE FUNCTION public.update_love_points_on_gift()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_points BIGINT;
  new_level INTEGER;
  old_level INTEGER;
  couple_row RECORD;
BEGIN
  -- Find active couple where these two are partners (in either direction)
  SELECT * INTO couple_row FROM love_couples
  WHERE is_active = true
    AND (
      (user1_id = NEW.sender_id AND user2_id = NEW.receiver_id)
      OR (user2_id = NEW.sender_id AND user1_id = NEW.receiver_id)
    )
  LIMIT 1;

  IF couple_row.id IS NULL THEN
    RETURN NEW;
  END IF;

  old_level := couple_row.love_level;
  new_points := couple_row.love_points + NEW.gold_amount;
  new_level := get_love_level(new_points);

  UPDATE love_couples
  SET love_points = new_points,
      love_level = new_level,
      updated_at = now()
  WHERE id = couple_row.id;

  -- Notify on level up
  IF new_level > old_level THEN
    INSERT INTO notifications (user_id, title, message, type) VALUES
      (couple_row.user1_id, '💕 وصلتم لمستوى ' || new_level || '!', 'حب حبيبيك ارتقى لمستوى جديد', 'love'),
      (couple_row.user2_id, '💕 وصلتم لمستوى ' || new_level || '!', 'حب حبيبيك ارتقى لمستوى جديد', 'love');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_love_points ON public.gift_transactions;
CREATE TRIGGER trg_update_love_points
AFTER INSERT ON public.gift_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_love_points_on_gift();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.love_couples;