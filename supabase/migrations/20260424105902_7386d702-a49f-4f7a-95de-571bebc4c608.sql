-- ============================================================
-- 1. Host monthly salary calculator (current month, day 1 to end)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_host_monthly_salary(_host_id uuid DEFAULT NULL, _ref date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id uuid := COALESCE(_host_id, auth.uid());
  caller uuid := auth.uid();
  is_admin boolean;
  is_self boolean;
  is_agent_of_host boolean;
  m_start date;
  m_end date;
  total_diamonds bigint := 0;
  total_minutes int := 0;
  active_days int := 0;
  total_hours numeric;
  base_salary_usd numeric;
  meets_days boolean;
  meets_hours boolean;
  penalty_pct int := 0;
  final_salary_usd numeric;
  agency_record record;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  is_self := (caller = target_id);
  SELECT (has_role(caller,'admin'::app_role) OR has_role(caller,'super_admin'::app_role)) INTO is_admin;

  -- Allow agency owner to view their host's salary
  SELECT EXISTS(
    SELECT 1 FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = target_id AND a.owner_id = caller
  ) INTO is_agent_of_host;

  IF NOT (is_self OR is_admin OR is_agent_of_host) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- Month boundaries (1st to last day)
  m_start := date_trunc('month', _ref)::date;
  m_end   := (date_trunc('month', _ref) + INTERVAL '1 month - 1 day')::date;

  -- Total diamonds received this month (gifts converted)
  SELECT COALESCE(SUM(diamond_amount),0) INTO total_diamonds
    FROM gift_transactions
    WHERE receiver_id = target_id
      AND created_at >= m_start
      AND created_at < (m_end + 1);

  -- Total mic minutes this month
  SELECT COALESCE(SUM(room_minutes),0) INTO total_minutes
    FROM daily_tasks
    WHERE user_id = target_id AND task_date BETWEEN m_start AND m_end;

  -- Active days = days with >= 60 minutes of mic
  SELECT COUNT(*) INTO active_days
    FROM daily_tasks
    WHERE user_id = target_id
      AND task_date BETWEEN m_start AND m_end
      AND room_minutes >= 60;

  total_hours := total_minutes::numeric / 60.0;

  -- Base salary: every 100,000 diamonds = $8
  base_salary_usd := (total_diamonds::numeric / 100000.0) * 8.0;

  -- Compliance check
  meets_days  := active_days >= 15;
  meets_hours := total_hours >= 40;

  IF NOT (meets_days AND meets_hours) THEN
    penalty_pct := 20;
  END IF;

  final_salary_usd := round(base_salary_usd * (1 - penalty_pct/100.0), 2);

  -- Agency info
  SELECT a.id AS agency_id, a.name AS agency_name
    INTO agency_record
    FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = target_id
    LIMIT 1;

  RETURN jsonb_build_object(
    'host_id', target_id,
    'month_start', m_start,
    'month_end', m_end,
    'total_diamonds', total_diamonds,
    'total_minutes', total_minutes,
    'total_hours', round(total_hours, 2),
    'active_days', active_days,
    'required_days', 15,
    'required_hours', 40,
    'meets_days', meets_days,
    'meets_hours', meets_hours,
    'base_salary_usd', round(base_salary_usd, 2),
    'penalty_pct', penalty_pct,
    'final_salary_usd', final_salary_usd,
    'agency_id', agency_record.agency_id,
    'agency_name', agency_record.agency_name
  );
END;
$$;

-- ============================================================
-- 2. Agency payroll report for the agent (their hosts + 15% commission)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_agency_payroll_report(_ref date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  agency_row record;
  m_start date;
  m_end date;
  hosts_data jsonb;
  total_salaries numeric := 0;
  agent_commission numeric := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT id, name INTO agency_row FROM agencies WHERE owner_id = caller LIMIT 1;
  IF agency_row.id IS NULL THEN
    RETURN jsonb_build_object('has_agency', false);
  END IF;

  m_start := date_trunc('month', _ref)::date;
  m_end   := (date_trunc('month', _ref) + INTERVAL '1 month - 1 day')::date;

  -- For each host, compute salary inline
  WITH host_calc AS (
    SELECT
      am.user_id AS host_id,
      p.display_name,
      p.avatar_url,
      COALESCE((SELECT SUM(diamond_amount) FROM gift_transactions
                WHERE receiver_id = am.user_id
                  AND created_at >= m_start AND created_at < (m_end + 1)), 0) AS diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN m_start AND m_end), 0) AS minutes,
      COALESCE((SELECT COUNT(*) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN m_start AND m_end
                AND room_minutes >= 60), 0) AS active_days
    FROM agency_members am
    LEFT JOIN profiles p ON p.id = am.user_id
    WHERE am.agency_id = agency_row.id AND am.badge = 'host'
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'host_id', host_id,
      'display_name', display_name,
      'avatar_url', avatar_url,
      'diamonds', diamonds,
      'hours', round(minutes::numeric/60.0, 2),
      'active_days', active_days,
      'meets_target', (active_days >= 15 AND minutes >= 2400),
      'base_salary_usd', round((diamonds::numeric/100000.0)*8.0, 2),
      'final_salary_usd', round(
        CASE WHEN (active_days >= 15 AND minutes >= 2400)
             THEN (diamonds::numeric/100000.0)*8.0
             ELSE (diamonds::numeric/100000.0)*8.0 * 0.8
        END, 2)
    ) ORDER BY diamonds DESC),'[]'::jsonb),
    COALESCE(SUM(
      CASE WHEN (active_days >= 15 AND minutes >= 2400)
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
    'month_start', m_start,
    'month_end', m_end,
    'hosts', hosts_data,
    'total_salaries_usd', round(total_salaries, 2),
    'agent_commission_usd', agent_commission,
    'grand_total_usd', round(total_salaries + agent_commission, 2)
  );
END;
$$;

-- ============================================================
-- 3. BOSS-only: full payroll snapshot across ALL agencies
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_boss_monthly_payroll(_ref date DEFAULT CURRENT_DATE)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller uuid := auth.uid();
  is_admin boolean;
  m_start date;
  m_end date;
  agencies_data jsonb;
  grand_salaries numeric := 0;
  grand_commissions numeric := 0;
BEGIN
  SELECT (has_role(caller,'admin'::app_role) OR has_role(caller,'super_admin'::app_role)) INTO is_admin;
  IF NOT is_admin THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  m_start := date_trunc('month', _ref)::date;
  m_end   := (date_trunc('month', _ref) + INTERVAL '1 month - 1 day')::date;

  WITH per_host AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.owner_id,
      am.user_id AS host_id,
      COALESCE((SELECT SUM(diamond_amount) FROM gift_transactions
                WHERE receiver_id = am.user_id
                  AND created_at >= m_start AND created_at < (m_end + 1)), 0) AS diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN m_start AND m_end), 0) AS minutes,
      COALESCE((SELECT COUNT(*) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN m_start AND m_end
                AND room_minutes >= 60), 0) AS active_days
    FROM agencies a
    LEFT JOIN agency_members am ON am.agency_id = a.id AND am.badge = 'host'
    WHERE a.status = 'approved'
  ),
  per_agency AS (
    SELECT
      agency_id, agency_name, owner_id,
      COUNT(host_id) FILTER (WHERE host_id IS NOT NULL) AS host_count,
      COALESCE(SUM(diamonds), 0) AS total_diamonds,
      COALESCE(SUM(
        CASE WHEN (active_days >= 15 AND minutes >= 2400)
             THEN (diamonds::numeric/100000.0)*8.0
             ELSE (diamonds::numeric/100000.0)*8.0 * 0.8
        END), 0) AS total_salaries
    FROM per_host
    GROUP BY agency_id, agency_name, owner_id
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'agency_id', pa.agency_id,
      'agency_name', pa.agency_name,
      'owner_id', pa.owner_id,
      'owner_name', op.display_name,
      'host_count', pa.host_count,
      'total_diamonds', pa.total_diamonds,
      'total_salaries_usd', round(pa.total_salaries, 2),
      'agent_commission_usd', round(pa.total_salaries * 0.15, 2),
      'grand_total_usd', round(pa.total_salaries * 1.15, 2)
    ) ORDER BY pa.total_salaries DESC), '[]'::jsonb),
    COALESCE(SUM(pa.total_salaries), 0),
    COALESCE(SUM(pa.total_salaries * 0.15), 0)
  INTO agencies_data, grand_salaries, grand_commissions
  FROM per_agency pa
  LEFT JOIN profiles op ON op.id = pa.owner_id;

  RETURN jsonb_build_object(
    'month_start', m_start,
    'month_end', m_end,
    'agencies', agencies_data,
    'grand_total_salaries_usd', round(grand_salaries, 2),
    'grand_total_commissions_usd', round(grand_commissions, 2),
    'grand_total_usd', round(grand_salaries + grand_commissions, 2)
  );
END;
$$;