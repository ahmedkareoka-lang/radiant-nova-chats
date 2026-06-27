-- Final root fix: Room Level must drive mic locks live, Agency Target must count support + mic days/hours live.

-- Room helpers stay canonical and search-path safe.
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

-- Clamp room mic_count to the currently unlocked cap. Support changes auto-expand to the new cap.
CREATE OR REPLACE FUNCTION public.normalize_room_level_and_mics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_level integer;
  v_cap integer;
BEGIN
  v_level := public.compute_room_level(COALESCE(NEW.total_support_coins, 0));
  v_cap := public.compute_room_max_mics(v_level);
  NEW.room_level := v_level;

  IF TG_OP = 'INSERT' OR NEW.total_support_coins IS DISTINCT FROM OLD.total_support_coins THEN
    NEW.mic_count := v_cap;
  ELSE
    NEW.mic_count := LEAST(GREATEST(COALESCE(NEW.mic_count, v_cap), 5), v_cap);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_room_level_and_mics ON public.rooms;
CREATE TRIGGER trg_normalize_room_level_and_mics
BEFORE INSERT OR UPDATE OF total_support_coins, room_level, mic_count ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.normalize_room_level_and_mics();

-- Canonical gift side effects: room level from gold coins, agency support target from received diamonds.
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
  v_receiver_agency uuid;
  v_support_amount bigint;
BEGIN
  v_effective_room_id := NEW.room_id;

  -- Old/stale clients may omit room_id. Infer it from the receiver's current active room.
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

  -- Room Level: lifetime room support is the gift coin/gold cost.
  IF v_effective_room_id IS NOT NULL AND COALESCE(NEW.gold_amount, 0) > 0 THEN
    UPDATE public.rooms
       SET total_support_coins = COALESCE(total_support_coins, 0) + NEW.gold_amount
     WHERE id = v_effective_room_id
     RETURNING total_support_coins INTO v_new_total;

    IF v_new_total IS NOT NULL THEN
      v_new_level := public.compute_room_level(v_new_total);
      v_new_cap := public.compute_room_max_mics(v_new_level);
      UPDATE public.rooms
         SET room_level = v_new_level,
             mic_count = v_new_cap
       WHERE id = v_effective_room_id;
    END IF;
  END IF;

  -- Agency Target support: UI/payroll target uses received diamonds.
  v_support_amount := COALESCE(NEW.diamond_amount, NEW.gold_amount, 0);
  IF NEW.receiver_id IS NOT NULL AND v_support_amount > 0 THEN
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

    -- Ensure agency owners have a target row before crediting.
    IF v_receiver_agency IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, user_id, role, badge)
      SELECT a.id, NEW.receiver_id,
             CASE WHEN a.owner_id = NEW.receiver_id THEN 'owner' ELSE 'member' END,
             'host'
        FROM public.agencies a
       WHERE a.id = v_receiver_agency
      ON CONFLICT (agency_id, user_id) DO UPDATE
        SET badge = 'host',
            role = CASE WHEN EXCLUDED.role = 'owner' THEN 'owner' ELSE public.agency_members.role END;
    END IF;

    UPDATE public.agency_members am
       SET total_support = COALESCE(am.total_support, 0) + v_support_amount
     WHERE am.user_id = NEW.receiver_id
       AND (v_receiver_agency IS NULL OR am.agency_id = v_receiver_agency);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_gift_side_effects
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_gift_side_effects();

-- Validate mic access against both the configured mic_count and the unlocked level cap.
CREATE OR REPLACE FUNCTION public.validate_mic_access(_user_id uuid, _room_id uuid, _slot integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  room_mic_count integer;
  level_cap integer;
  effective_mics integer;
  slot_locked boolean;
  slot_occupied boolean;
  user_banned boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.room_bans WHERE room_id = _room_id AND user_id = _user_id) INTO user_banned;
  IF user_banned THEN RETURN false; END IF;

  SELECT COALESCE(mic_count, 5), public.compute_room_max_mics(COALESCE(room_level, public.compute_room_level(total_support_coins)))
    INTO room_mic_count, level_cap
    FROM public.rooms
   WHERE id = _room_id;
  IF room_mic_count IS NULL THEN RETURN false; END IF;

  effective_mics := LEAST(room_mic_count, level_cap);
  IF _slot < 0 OR _slot >= effective_mics THEN RETURN false; END IF;

  SELECT _slot = ANY(COALESCE(locked_slots, '{}')) INTO slot_locked FROM public.rooms WHERE id = _room_id;
  IF slot_locked THEN
    IF NOT EXISTS(SELECT 1 FROM public.rooms WHERE id = _room_id AND host_id = _user_id)
       AND NOT public.has_role(_user_id, 'admin')
    THEN RETURN false; END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM public.room_members WHERE room_id = _room_id AND mic_slot = _slot AND user_id != _user_id) INTO slot_occupied;
  IF slot_occupied THEN RETURN false; END IF;

  IF EXISTS(SELECT 1 FROM public.rooms WHERE id = _room_id AND _user_id = ANY(COALESCE(muted_users, '{}'))) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- One heartbeat RPC now updates BOTH lifetime agency mic hours and daily room_minutes used for days/hours targets.
CREATE OR REPLACE FUNCTION public.increment_agency_mic_hours(_user_id uuid, _hours numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_minutes integer;
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

  v_minutes := FLOOR(_hours * 60)::integer;
  IF v_minutes > 0 THEN
    INSERT INTO public.daily_tasks (user_id, task_date)
    VALUES (_user_id, CURRENT_DATE)
    ON CONFLICT (user_id, task_date) DO NOTHING;

    UPDATE public.daily_tasks
       SET room_minutes = COALESCE(room_minutes, 0) + v_minutes
     WHERE user_id = _user_id
       AND task_date = CURRENT_DATE;
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) TO authenticated;

-- Owners are always agent + host and get a host target row.
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

-- Host dashboard must work even if a historical owner row was missing before triggers existed.
CREATE OR REPLACE FUNCTION public.get_host_agency_dashboard()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  m_agency_id uuid; m_total_support bigint; m_mic_hours numeric;
  today_diamonds bigint := 0; today_minutes int := 0;
  cycle_diamonds bigint := 0; cycle_minutes int := 0;
  cyc record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT agency_id, total_support, mic_hours
    INTO m_agency_id, m_total_support, m_mic_hours
    FROM public.agency_members
   WHERE user_id = me
   LIMIT 1;

  IF m_agency_id IS NULL THEN
    SELECT id INTO m_agency_id
      FROM public.agencies
     WHERE owner_id = me AND status = 'approved' AND is_active = true
     LIMIT 1;

    IF m_agency_id IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id, user_id, role, badge)
      VALUES (m_agency_id, me, 'owner', 'host')
      ON CONFLICT (agency_id, user_id) DO UPDATE SET role = 'owner', badge = 'host';

      SELECT total_support, mic_hours INTO m_total_support, m_mic_hours
        FROM public.agency_members
       WHERE agency_id = m_agency_id AND user_id = me;
    END IF;
  END IF;

  IF m_agency_id IS NULL THEN RETURN jsonb_build_object('has_agency', false); END IF;

  SELECT * INTO cyc FROM public.get_target_cycle(CURRENT_DATE) LIMIT 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO today_diamonds
    FROM public.gift_transactions
    WHERE receiver_id = me AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO cycle_diamonds
    FROM public.gift_transactions
    WHERE receiver_id = me AND created_at >= cyc.cycle_start AND created_at < (cyc.cycle_end + 1);

  SELECT COALESCE(room_minutes,0) INTO today_minutes
    FROM public.daily_tasks WHERE user_id = me AND task_date = CURRENT_DATE;

  SELECT COALESCE(SUM(room_minutes),0) INTO cycle_minutes
    FROM public.daily_tasks WHERE user_id = me AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end;

  RETURN jsonb_build_object(
    'has_agency', true,
    'agency_id', m_agency_id,
    'today_diamonds', today_diamonds,
    'today_minutes', COALESCE(today_minutes, 0),
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end', cyc.cycle_end,
    'cycle_diamonds', cycle_diamonds,
    'cycle_minutes', COALESCE(cycle_minutes, 0),
    'lifetime_support', COALESCE(m_total_support, 0),
    'lifetime_mic_hours', COALESCE(m_mic_hours, 0)
  );
END;
$$;

-- Agent overview includes owners too, so owner targets are visible and tracked.
CREATE OR REPLACE FUNCTION public.get_my_agency_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  ag record;
  cyc record;
  hosts_data jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO ag FROM public.agencies WHERE owner_id = me AND status = 'approved' AND is_active = true LIMIT 1;
  IF ag.id IS NULL THEN RETURN jsonb_build_object('has_agency', false); END IF;

  SELECT * INTO cyc FROM public.get_target_cycle(CURRENT_DATE) LIMIT 1;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY (t.cycle_diamonds)::bigint DESC), '[]'::jsonb)
    INTO hosts_data
  FROM (
    SELECT
      m.user_id AS host_id,
      p.display_name,
      p.user_id AS friendly_id,
      p.avatar_url,
      m.role,
      m.badge,
      (m.user_id = ag.owner_id) AS is_owner,
      m.joined_at,
      m.mic_hours AS lifetime_hours,
      m.total_support AS lifetime_support,
      COALESCE((SELECT SUM(diamond_amount) FROM public.gift_transactions
        WHERE receiver_id = m.user_id AND created_at >= cyc.cycle_start AND created_at < cyc.cycle_end + 1), 0) AS cycle_diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM public.daily_tasks
        WHERE user_id = m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end), 0) AS cycle_minutes,
      COALESCE((SELECT COUNT(*) FROM public.daily_tasks
        WHERE user_id = m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end AND room_minutes >= 60), 0) AS cycle_active_days
    FROM public.agency_members m
    LEFT JOIN public.profiles p ON p.id = m.user_id
    WHERE m.agency_id = ag.id
      AND (m.badge = 'host' OR m.role = 'owner' OR m.user_id = ag.owner_id)
  ) t;

  RETURN jsonb_build_object(
    'has_agency', true,
    'agency_id', ag.id,
    'agency_name', ag.name,
    'created_at', ag.created_at,
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end', cyc.cycle_end,
    'host_count', (SELECT COUNT(*) FROM public.agency_members m WHERE m.agency_id = ag.id AND (m.badge = 'host' OR m.role = 'owner' OR m.user_id = ag.owner_id)),
    'hosts', hosts_data
  );
END;
$$;

-- Rebuild derived totals from source-of-truth history.
UPDATE public.rooms r
   SET total_support_coins = COALESCE(s.total_gold, 0)
  FROM (
    SELECT room_id, SUM(gold_amount)::bigint AS total_gold
      FROM public.gift_transactions
     WHERE room_id IS NOT NULL
     GROUP BY room_id
  ) s
 WHERE r.id = s.room_id;

UPDATE public.rooms r
   SET total_support_coins = 0
 WHERE NOT EXISTS (SELECT 1 FROM public.gift_transactions gt WHERE gt.room_id = r.id);

UPDATE public.rooms
   SET room_level = public.compute_room_level(total_support_coins),
       mic_count = public.compute_room_max_mics(public.compute_room_level(total_support_coins));

UPDATE public.agency_members am
   SET total_support = COALESCE(s.total_diamonds, 0)
  FROM (
    SELECT receiver_id, SUM(diamond_amount)::bigint AS total_diamonds
      FROM public.gift_transactions
     GROUP BY receiver_id
  ) s
 WHERE am.user_id = s.receiver_id;

UPDATE public.agency_members am
   SET total_support = 0
 WHERE NOT EXISTS (SELECT 1 FROM public.gift_transactions gt WHERE gt.receiver_id = am.user_id);

-- Realtime publication guard.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'gift_transactions') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agency_members') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_members;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'daily_tasks') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks;
  END IF;
END $$;
