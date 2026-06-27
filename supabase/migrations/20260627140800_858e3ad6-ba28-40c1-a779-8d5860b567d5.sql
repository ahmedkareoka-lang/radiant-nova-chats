-- Fix gift -> room level -> agency target pipeline

-- 1) Remove overlapping legacy triggers that were double/triple-counting or racing.
DROP TRIGGER IF EXISTS trg_accumulate_host_agency_support ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_credit_agency_target ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_credit_room_support ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_apply_gift_side_effects ON public.gift_transactions;

-- 2) Canonical room level helpers.
CREATE OR REPLACE FUNCTION public.compute_room_level(_coins bigint)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN COALESCE(_coins, 0) >= 25000000 THEN 6
    WHEN COALESCE(_coins, 0) >= 13000000 THEN 5
    WHEN COALESCE(_coins, 0) >=  8000000 THEN 4
    WHEN COALESCE(_coins, 0) >=  3000000 THEN 3
    WHEN COALESCE(_coins, 0) >=   750000 THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.compute_room_max_mics(_level integer)
RETURNS integer
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE COALESCE(_level, 1)
    WHEN 6 THEN 20
    WHEN 5 THEN 18
    WHEN 4 THEN 16
    WHEN 3 THEN 12
    WHEN 2 THEN 8
    ELSE 5
  END;
$$;

-- 3) One canonical trigger function for every gift side effect.
CREATE OR REPLACE FUNCTION public.apply_gift_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total bigint;
  v_new_level integer;
  v_new_cap integer;
  v_current_mics integer;
  v_receiver_agency uuid;
BEGIN
  -- Room lifetime support and level are driven by room-tagged gift gold amount.
  IF NEW.room_id IS NOT NULL AND COALESCE(NEW.gold_amount, 0) > 0 THEN
    UPDATE public.rooms
       SET total_support_coins = COALESCE(total_support_coins, 0) + NEW.gold_amount
     WHERE id = NEW.room_id
     RETURNING total_support_coins, mic_count
          INTO v_new_total, v_current_mics;

    IF v_new_total IS NOT NULL THEN
      v_new_level := public.compute_room_level(v_new_total);
      v_new_cap := public.compute_room_max_mics(v_new_level);

      UPDATE public.rooms
         SET room_level = v_new_level,
             mic_count = LEAST(GREATEST(COALESCE(v_current_mics, 5), 5), v_new_cap)
       WHERE id = NEW.room_id;
    END IF;
  END IF;

  -- Agency target: credit the receiver's active agency membership only once.
  IF NEW.receiver_id IS NOT NULL AND COALESCE(NEW.gold_amount, 0) > 0 THEN
    SELECT agency_id INTO v_receiver_agency
      FROM public.profiles
     WHERE id = NEW.receiver_id;

    UPDATE public.agency_members am
       SET total_support = COALESCE(am.total_support, 0) + NEW.gold_amount
     WHERE am.user_id = NEW.receiver_id
       AND (v_receiver_agency IS NULL OR am.agency_id = v_receiver_agency);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_gift_side_effects
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_gift_side_effects();

-- 4) Atomic gift send with optional room id logs the transaction server-side.
CREATE OR REPLACE FUNCTION public.send_gift_atomic(
  _receiver_id uuid,
  _gold_amount bigint,
  _gift_name text,
  _room_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender uuid := auth.uid();
  rate int;
  diamond_amount bigint;
  cur_coins bigint;
  inserted_tx_id uuid;
BEGIN
  IF sender IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  IF _receiver_id IS NULL THEN
    RAISE EXCEPTION 'Missing receiver';
  END IF;
  IF _gold_amount IS NULL OR _gold_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  SELECT coins INTO cur_coins
    FROM public.profiles
   WHERE id = sender
   FOR UPDATE;

  IF cur_coins IS NULL OR cur_coins < _gold_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  SELECT COALESCE(NULLIF(value, '')::int, 50)
    INTO rate
    FROM public.system_settings
   WHERE key = 'gift_conversion_rate';
  rate := COALESCE(rate, 50);
  diamond_amount := floor((_gold_amount * rate) / 100.0)::bigint;

  PERFORM public.deduct_coins_add_wealth(sender, _gold_amount, _gold_amount);
  PERFORM public.add_diamonds_add_charisma(_receiver_id, diamond_amount, diamond_amount);

  INSERT INTO public.gift_transactions (
    sender_id,
    receiver_id,
    gift_name,
    gold_amount,
    diamond_amount,
    room_id
  ) VALUES (
    sender,
    _receiver_id,
    COALESCE(NULLIF(_gift_name, ''), 'Gift'),
    _gold_amount,
    diamond_amount,
    _room_id
  ) RETURNING id INTO inserted_tx_id;

  RETURN jsonb_build_object(
    'transaction_id', inserted_tx_id,
    'diamond_amount', diamond_amount,
    'gold_amount', _gold_amount,
    'room_id', _room_id
  );
END;
$$;

-- Keep old 3-argument clients working; they still log a transaction but without room credit.
CREATE OR REPLACE FUNCTION public.send_gift_atomic(
  _receiver_id uuid,
  _gold_amount bigint,
  _gift_name text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.send_gift_atomic(_receiver_id, _gold_amount, _gift_name, NULL::uuid);
$$;

REVOKE EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text, uuid) TO authenticated;

-- 5) Owner must always be both agent and host, and linked to agency membership.
CREATE OR REPLACE FUNCTION public.sync_agent_flag_from_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.status = 'approved' AND NEW.is_active = true THEN
      UPDATE public.profiles
         SET is_agent = true,
             is_host = true,
             agency_id = NEW.id
       WHERE id = NEW.owner_id;
    ELSE
      IF NOT EXISTS (
        SELECT 1 FROM public.agencies
         WHERE owner_id = NEW.owner_id
           AND status = 'approved'
           AND is_active = true
           AND id <> NEW.id
      ) THEN
        UPDATE public.profiles
           SET is_agent = false,
               agency_id = CASE WHEN agency_id = NEW.id THEN NULL ELSE agency_id END
         WHERE id = NEW.owner_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_host_flag_from_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM public.agencies WHERE id = NEW.agency_id AND owner_id = NEW.user_id)
      INTO v_is_owner;

    IF v_is_owner THEN
      UPDATE public.profiles
         SET is_agent = true,
             is_host = true,
             agency_id = NEW.agency_id
       WHERE id = NEW.user_id;
    ELSE
      UPDATE public.profiles
         SET is_host = true,
             is_agent = false,
             agency_id = NEW.agency_id
       WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF NOT EXISTS (SELECT 1 FROM public.agency_members WHERE user_id = OLD.user_id AND id <> OLD.id) THEN
      IF NOT EXISTS (SELECT 1 FROM public.agencies WHERE owner_id = OLD.user_id AND status = 'approved' AND is_active = true) THEN
        UPDATE public.profiles SET is_host = false, is_agent = false, agency_id = NULL WHERE id = OLD.user_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6) Backfill/fix existing derived state from source-of-truth transactions.
UPDATE public.rooms r
   SET total_support_coins = COALESCE(s.total_gold, 0),
       room_level = public.compute_room_level(COALESCE(s.total_gold, 0)),
       mic_count = LEAST(
         GREATEST(COALESCE(r.mic_count, 5), 5),
         public.compute_room_max_mics(public.compute_room_level(COALESCE(s.total_gold, 0)))
       )
  FROM (
    SELECT room_id, SUM(gold_amount)::bigint AS total_gold
      FROM public.gift_transactions
     WHERE room_id IS NOT NULL
     GROUP BY room_id
  ) s
 WHERE r.id = s.room_id;

UPDATE public.rooms r
   SET total_support_coins = 0,
       room_level = 1,
       mic_count = LEAST(GREATEST(COALESCE(r.mic_count, 5), 5), 5)
 WHERE NOT EXISTS (
   SELECT 1 FROM public.gift_transactions gt WHERE gt.room_id = r.id
 );

UPDATE public.agency_members am
   SET total_support = COALESCE(s.total_gold, 0)
  FROM (
    SELECT receiver_id, SUM(gold_amount)::bigint AS total_gold
      FROM public.gift_transactions
     GROUP BY receiver_id
  ) s
 WHERE am.user_id = s.receiver_id;

UPDATE public.agency_members am
   SET total_support = 0
 WHERE NOT EXISTS (
   SELECT 1 FROM public.gift_transactions gt WHERE gt.receiver_id = am.user_id
 );

UPDATE public.profiles p
   SET is_agent = true,
       is_host = true,
       agency_id = a.id
  FROM public.agencies a
 WHERE a.owner_id = p.id
   AND a.status = 'approved'
   AND a.is_active = true;

INSERT INTO public.agency_members (agency_id, user_id, role, badge)
SELECT a.id, a.owner_id, 'owner', 'agent'
  FROM public.agencies a
 WHERE a.status = 'approved'
   AND a.is_active = true
ON CONFLICT (agency_id, user_id) DO UPDATE
  SET role = 'owner', badge = 'agent';

-- 7) Realtime publication guard (safe if already added).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'gift_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'agency_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_members;
  END IF;
END $$;