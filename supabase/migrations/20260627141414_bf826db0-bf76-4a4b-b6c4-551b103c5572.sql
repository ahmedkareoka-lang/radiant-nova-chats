-- Root fix for Room Level + Agency Target pipeline

-- 1) Canonical helpers: level thresholds + unlocked mics.
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

-- 2) One canonical gift side-effect trigger.
DROP TRIGGER IF EXISTS trg_accumulate_host_agency_support ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_credit_agency_target ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_credit_room_support ON public.gift_transactions;
DROP TRIGGER IF EXISTS trg_apply_gift_side_effects ON public.gift_transactions;

CREATE OR REPLACE FUNCTION public.apply_gift_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_effective_room_id uuid;
  v_new_total bigint;
  v_new_level integer;
  v_new_cap integer;
  v_current_mics integer;
  v_receiver_agency uuid;
BEGIN
  -- If the client did not pass room_id, infer it from the receiver's active room.
  v_effective_room_id := NEW.room_id;
  IF v_effective_room_id IS NULL THEN
    SELECT rm.room_id
      INTO v_effective_room_id
      FROM public.room_members rm
      JOIN public.rooms r ON r.id = rm.room_id AND r.is_active = true
     WHERE rm.user_id = NEW.receiver_id
     ORDER BY rm.joined_at DESC NULLS LAST
     LIMIT 1;

    IF v_effective_room_id IS NOT NULL THEN
      UPDATE public.gift_transactions
         SET room_id = v_effective_room_id
       WHERE id = NEW.id;
      NEW.room_id := v_effective_room_id;
    END IF;
  END IF;

  -- Room lifetime support and level are driven by room-tagged gift gold amount.
  IF v_effective_room_id IS NOT NULL AND COALESCE(NEW.gold_amount, 0) > 0 THEN
    UPDATE public.rooms
       SET total_support_coins = COALESCE(total_support_coins, 0) + NEW.gold_amount
     WHERE id = v_effective_room_id
     RETURNING total_support_coins, mic_count
          INTO v_new_total, v_current_mics;

    IF v_new_total IS NOT NULL THEN
      v_new_level := public.compute_room_level(v_new_total);
      v_new_cap := public.compute_room_max_mics(v_new_level);

      UPDATE public.rooms
         SET room_level = v_new_level,
             mic_count = GREATEST(LEAST(COALESCE(v_current_mics, 5), 20), v_new_cap)
       WHERE id = v_effective_room_id;
    END IF;
  END IF;

  -- Agency target: credit receiver's agency membership. Owners are tracked too.
  IF NEW.receiver_id IS NOT NULL AND COALESCE(NEW.gold_amount, 0) > 0 THEN
    SELECT agency_id INTO v_receiver_agency
      FROM public.profiles
     WHERE id = NEW.receiver_id;

    IF v_receiver_agency IS NULL THEN
      SELECT id INTO v_receiver_agency
        FROM public.agencies
       WHERE owner_id = NEW.receiver_id
         AND status = 'approved'
         AND is_active = true
       LIMIT 1;
    END IF;

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

-- 3) Atomic gift send writes the gift transaction server-side with room context.
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
  effective_room_id uuid := _room_id;
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

  -- Defensive room fallback for old or stale clients.
  IF effective_room_id IS NULL THEN
    SELECT rm.room_id
      INTO effective_room_id
      FROM public.room_members rm
      JOIN public.rooms r ON r.id = rm.room_id AND r.is_active = true
     WHERE rm.user_id = _receiver_id
     ORDER BY rm.joined_at DESC NULLS LAST
     LIMIT 1;
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
    sender_id, receiver_id, gift_name, gold_amount, diamond_amount, room_id
  ) VALUES (
    sender,
    _receiver_id,
    COALESCE(NULLIF(_gift_name, ''), 'Gift'),
    _gold_amount,
    diamond_amount,
    effective_room_id
  ) RETURNING id INTO inserted_tx_id;

  RETURN jsonb_build_object(
    'transaction_id', inserted_tx_id,
    'diamond_amount', diamond_amount,
    'gold_amount', _gold_amount,
    'room_id', effective_room_id
  );
END;
$$;

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

-- 4) Reliable mic-hour increment for agency target; direct table updates may be blocked by RLS.
CREATE OR REPLACE FUNCTION public.increment_agency_mic_hours(_user_id uuid, _hours numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _hours IS NULL OR _hours <= 0 OR _hours > 1 THEN
    RAISE EXCEPTION 'Invalid hours increment';
  END IF;

  UPDATE public.agency_members
     SET mic_hours = COALESCE(mic_hours, 0) + _hours
   WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) TO authenticated;

-- 5) Make agency owners count as both owner/agent and host in membership reports.
INSERT INTO public.agency_members (agency_id, user_id, role, badge)
SELECT a.id, a.owner_id, 'owner', 'host'
  FROM public.agencies a
 WHERE a.status = 'approved'
   AND a.is_active = true
ON CONFLICT (agency_id, user_id) DO UPDATE
  SET role = 'owner', badge = 'host';

UPDATE public.profiles p
   SET is_agent = true,
       is_host = true,
       agency_id = a.id
  FROM public.agencies a
 WHERE a.owner_id = p.id
   AND a.status = 'approved'
   AND a.is_active = true;

CREATE OR REPLACE FUNCTION public.ensure_owner_in_agency_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND NEW.is_active = true THEN
    INSERT INTO public.agency_members (agency_id, user_id, role, badge)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'host')
    ON CONFLICT (agency_id, user_id) DO UPDATE
      SET role = 'owner', badge = 'host';

    UPDATE public.profiles
       SET is_agent = true,
           is_host = true,
           agency_id = NEW.id
     WHERE id = NEW.owner_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_owner_in_agency_members ON public.agencies;
CREATE TRIGGER trg_ensure_owner_in_agency_members
AFTER INSERT OR UPDATE OF status, owner_id, is_active ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.ensure_owner_in_agency_members();

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

-- 6) Reports must include agency owners too, not only rows whose badge was exactly 'host'.
CREATE OR REPLACE FUNCTION public.get_agency_payroll_report(_ref date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  agency_row record;
  cyc record;
  hosts_data jsonb;
  total_salaries numeric := 0;
  agent_commission numeric := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT id, name INTO agency_row FROM public.agencies WHERE owner_id = caller LIMIT 1;
  IF agency_row.id IS NULL THEN
    RETURN jsonb_build_object('has_agency', false);
  END IF;

  SELECT * INTO cyc FROM public.get_target_cycle(_ref) LIMIT 1;

  WITH host_calc AS (
    SELECT
      am.user_id AS host_id,
      p.display_name,
      p.avatar_url,
      COALESCE((SELECT SUM(diamond_amount) FROM public.gift_transactions
                WHERE receiver_id = am.user_id
                  AND created_at >= cyc.cycle_start AND created_at < (cyc.cycle_end + 1)), 0) AS diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM public.daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end), 0) AS minutes,
      COALESCE((SELECT COUNT(*) FROM public.daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
                AND room_minutes >= 60), 0) AS active_days
    FROM public.agency_members am
    LEFT JOIN public.profiles p ON p.id = am.user_id
    LEFT JOIN public.agencies a ON a.id = am.agency_id
    WHERE am.agency_id = agency_row.id
      AND (am.badge = 'host' OR am.role = 'owner' OR a.owner_id = am.user_id)
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'host_id', host_id,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'diamonds', diamonds,
      'hours', round(minutes::numeric/60.0, 2),
      'active_days', active_days,
      'meets_target', (active_days >= 8 AND minutes >= 1200),
      'base_salary_usd', round((diamonds::numeric/100000.0)*8.0, 2),
      'final_salary_usd', round(
        CASE WHEN (active_days >= 8 AND minutes >= 1200)
             THEN (diamonds::numeric/100000.0)*8.0
             ELSE (diamonds::numeric/100000.0)*8.0 * 0.8
        END, 2)
    ) ORDER BY diamonds DESC),'[]'::jsonb),
    COALESCE(SUM(
      CASE WHEN (active_days >= 8 AND minutes >= 1200)
           THEN (diamonds::numeric/100000.0)*8.0
           ELSE (diamonds::numeric/100000.0)*8.0 * 0.8
      END), 0)
  INTO hosts_data, total_salaries
  FROM host_calc;

  agent_commission := round(total_salaries * 0.15, 2);

  RETURN jsonb_build_object(
    'has_agency', true,
    'agency_id', agency_row.id,
    'agency_name', agency_row.name,
    'cycle_label', cyc.cycle_label,
    'month_start', cyc.cycle_start,
    'month_end', cyc.cycle_end,
    'hosts', hosts_data,
    'total_salaries_usd', round(total_salaries, 2),
    'agent_commission_usd', agent_commission,
    'grand_total_usd', round(total_salaries + agent_commission, 2)
  );
END;
$$;

-- 7) Backfill derived state from current source-of-truth data.
UPDATE public.rooms r
   SET total_support_coins = COALESCE(s.total_gold, 0),
       room_level = public.compute_room_level(COALESCE(s.total_gold, 0)),
       mic_count = GREATEST(
         LEAST(COALESCE(r.mic_count, 5), 20),
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
       mic_count = LEAST(GREATEST(COALESCE(r.mic_count, 5), 5), 20)
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

-- 8) Realtime publication guard.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gift_transactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agency_members'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_members;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'daily_tasks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;
END $$;