-- ============================================================
-- 1) Auto-sync is_agent flag from agencies (owner = approved agency)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_agent_flag_from_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Mark owner as agent only if they own at least one approved+active agency
    IF NEW.status = 'approved' AND NEW.is_active = true THEN
      UPDATE profiles SET is_agent = true, is_host = false WHERE id = NEW.owner_id;
    ELSE
      -- Recompute: owner stays agent only if they still own another approved agency
      IF NOT EXISTS (
        SELECT 1 FROM agencies
        WHERE owner_id = NEW.owner_id AND status = 'approved' AND is_active = true
          AND id <> NEW.id
      ) THEN
        UPDATE profiles SET is_agent = false WHERE id = NEW.owner_id;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agent_flag ON public.agencies;
CREATE TRIGGER trg_sync_agent_flag
AFTER INSERT OR UPDATE OF status, is_active ON public.agencies
FOR EACH ROW
EXECUTE FUNCTION public.sync_agent_flag_from_agency();

-- ============================================================
-- 2) Auto-sync is_host flag from agency_members (member but not owner)
-- ============================================================
CREATE OR REPLACE FUNCTION public.sync_host_flag_from_membership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_owner boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT EXISTS(SELECT 1 FROM agencies WHERE id = NEW.agency_id AND owner_id = NEW.user_id)
      INTO is_owner;
    IF is_owner THEN
      UPDATE profiles SET is_agent = true, is_host = false, agency_id = NEW.agency_id WHERE id = NEW.user_id;
    ELSE
      UPDATE profiles SET is_host = true, is_agent = false, agency_id = NEW.agency_id WHERE id = NEW.user_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    -- Only clear host flag if no longer member of any agency AND not an owner
    IF NOT EXISTS (SELECT 1 FROM agency_members WHERE user_id = OLD.user_id AND id <> OLD.id) THEN
      IF NOT EXISTS (SELECT 1 FROM agencies WHERE owner_id = OLD.user_id AND status = 'approved' AND is_active = true) THEN
        UPDATE profiles SET is_host = false, is_agent = false, agency_id = NULL WHERE id = OLD.user_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_host_flag ON public.agency_members;
CREATE TRIGGER trg_sync_host_flag
AFTER INSERT OR DELETE ON public.agency_members
FOR EACH ROW
EXECUTE FUNCTION public.sync_host_flag_from_membership();

-- ============================================================
-- 3) BACKFILL existing flags so they reflect reality
-- ============================================================
-- All owners of approved agencies → is_agent = true
UPDATE profiles p
SET is_agent = true, is_host = false
WHERE EXISTS (
  SELECT 1 FROM agencies a
  WHERE a.owner_id = p.id AND a.status = 'approved' AND a.is_active = true
);

-- All non-owner members → is_host = true
UPDATE profiles p
SET is_host = true, is_agent = false
WHERE EXISTS (
  SELECT 1 FROM agency_members m
  JOIN agencies a ON a.id = m.agency_id
  WHERE m.user_id = p.id AND a.owner_id <> p.id
)
AND NOT EXISTS (
  SELECT 1 FROM agencies a2
  WHERE a2.owner_id = p.id AND a2.status = 'approved' AND a2.is_active = true
);

-- Anyone neither owner nor member → both false
UPDATE profiles p
SET is_agent = false, is_host = false, agency_id = NULL
WHERE NOT EXISTS (SELECT 1 FROM agency_members m WHERE m.user_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM agencies a WHERE a.owner_id = p.id AND a.status = 'approved' AND a.is_active = true);

-- ============================================================
-- 4) New RPC: full agency overview for the owning agent
--    Returns agency info + all hosts with 15-day cycle stats
-- ============================================================
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

  SELECT * INTO ag FROM agencies WHERE owner_id = me AND status = 'approved' AND is_active = true LIMIT 1;
  IF ag.id IS NULL THEN RETURN jsonb_build_object('has_agency', false); END IF;

  SELECT * INTO cyc FROM get_target_cycle(CURRENT_DATE) LIMIT 1;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY (t->>'cycle_diamonds')::bigint DESC), '[]'::jsonb)
  INTO hosts_data
  FROM (
    SELECT
      m.user_id AS host_id,
      p.display_name,
      p.user_id AS friendly_id,
      p.avatar_url,
      m.joined_at,
      m.mic_hours AS lifetime_hours,
      m.total_support AS lifetime_support,
      COALESCE((SELECT SUM(diamond_amount) FROM gift_transactions
        WHERE receiver_id = m.user_id AND created_at >= cyc.cycle_start AND created_at < cyc.cycle_end + 1), 0) AS cycle_diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM daily_tasks
        WHERE user_id = m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end), 0) AS cycle_minutes,
      COALESCE((SELECT COUNT(*) FROM daily_tasks
        WHERE user_id = m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end AND room_minutes >= 60), 0) AS cycle_active_days
    FROM agency_members m
    LEFT JOIN profiles p ON p.id = m.user_id
    WHERE m.agency_id = ag.id AND m.user_id <> ag.owner_id
  ) t;

  RETURN jsonb_build_object(
    'has_agency', true,
    'agency_id', ag.id,
    'agency_name', ag.name,
    'created_at', ag.created_at,
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end', cyc.cycle_end,
    'host_count', (SELECT COUNT(*) FROM agency_members WHERE agency_id = ag.id AND user_id <> ag.owner_id),
    'hosts', hosts_data
  );
END;
$$;

-- ============================================================
-- 5) New RPC: host's agency events log (15-day cycle activity)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_host_events()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  m_agency_id uuid;
  ag_name text;
  cyc record;
  daily_log jsonb;
  recent_gifts jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT agency_id INTO m_agency_id FROM agency_members WHERE user_id = me LIMIT 1;
  IF m_agency_id IS NULL THEN RETURN jsonb_build_object('has_agency', false); END IF;
  SELECT name INTO ag_name FROM agencies WHERE id = m_agency_id;

  SELECT * INTO cyc FROM get_target_cycle(CURRENT_DATE) LIMIT 1;

  -- Daily breakdown over the 15-day cycle
  WITH days AS (
    SELECT generate_series(cyc.cycle_start, cyc.cycle_end, '1 day'::interval)::date AS day
  ),
  diamonds AS (
    SELECT date_trunc('day', created_at)::date AS day, SUM(diamond_amount) AS d, COUNT(*) AS gift_count
    FROM gift_transactions WHERE receiver_id = me
      AND created_at >= cyc.cycle_start AND created_at < cyc.cycle_end + 1
    GROUP BY 1
  ),
  minutes AS (
    SELECT task_date AS day, room_minutes AS m
    FROM daily_tasks WHERE user_id = me AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d.day,
    'diamonds', COALESCE(diamonds.d, 0),
    'gift_count', COALESCE(diamonds.gift_count, 0),
    'minutes', COALESCE(minutes.m, 0),
    'is_active', COALESCE(minutes.m, 0) >= 60
  ) ORDER BY d.day DESC), '[]'::jsonb)
  INTO daily_log
  FROM days d
  LEFT JOIN diamonds ON diamonds.day = d.day
  LEFT JOIN minutes ON minutes.day = d.day;

  -- Top 20 recent gifts in cycle
  SELECT COALESCE(jsonb_agg(row_to_json(g) ORDER BY g.created_at DESC), '[]'::jsonb)
  INTO recent_gifts
  FROM (
    SELECT gt.gift_name, gt.diamond_amount, gt.created_at, p.display_name AS sender_name
    FROM gift_transactions gt
    LEFT JOIN profiles p ON p.id = gt.sender_id
    WHERE gt.receiver_id = me AND gt.created_at >= cyc.cycle_start
    ORDER BY gt.created_at DESC
    LIMIT 20
  ) g;

  RETURN jsonb_build_object(
    'has_agency', true,
    'agency_id', m_agency_id,
    'agency_name', ag_name,
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end', cyc.cycle_end,
    'daily_log', daily_log,
    'recent_gifts', recent_gifts
  );
END;
$$;