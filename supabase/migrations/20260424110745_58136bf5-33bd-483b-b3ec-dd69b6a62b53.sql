
-- Update host monthly salary -> now per 15-day cycle
CREATE OR REPLACE FUNCTION public.get_host_monthly_salary(_host_id uuid DEFAULT NULL::uuid, _ref date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_id uuid := COALESCE(_host_id, auth.uid());
  caller uuid := auth.uid();
  is_admin boolean;
  is_self boolean;
  is_agent_of_host boolean;
  cyc record;
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

  SELECT EXISTS(
    SELECT 1 FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = target_id AND a.owner_id = caller
  ) INTO is_agent_of_host;

  IF NOT (is_self OR is_admin OR is_agent_of_host) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  -- 15-day cycle window (1-15 or 16-end-of-month)
  SELECT * INTO cyc FROM get_target_cycle(_ref) LIMIT 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO total_diamonds
    FROM gift_transactions
    WHERE receiver_id = target_id
      AND created_at >= cyc.cycle_start
      AND created_at < (cyc.cycle_end + 1);

  SELECT COALESCE(SUM(room_minutes),0) INTO total_minutes
    FROM daily_tasks
    WHERE user_id = target_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end;

  SELECT COUNT(*) INTO active_days
    FROM daily_tasks
    WHERE user_id = target_id
      AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
      AND room_minutes >= 60;

  total_hours := total_minutes::numeric / 60.0;
  base_salary_usd := (total_diamonds::numeric / 100000.0) * 8.0;

  -- Compliance for 15-day cycle: 8 active days + 20 hours
  meets_days  := active_days >= 8;
  meets_hours := total_hours >= 20;

  IF NOT (meets_days AND meets_hours) THEN
    penalty_pct := 20;
  END IF;

  final_salary_usd := round(base_salary_usd * (1 - penalty_pct/100.0), 2);

  SELECT a.id AS agency_id, a.name AS agency_name
    INTO agency_record
    FROM agency_members am
    JOIN agencies a ON a.id = am.agency_id
    WHERE am.user_id = target_id
    LIMIT 1;

  RETURN jsonb_build_object(
    'host_id', target_id,
    'cycle_label', cyc.cycle_label,
    'month_start', cyc.cycle_start,
    'month_end', cyc.cycle_end,
    'total_diamonds', total_diamonds,
    'total_minutes', total_minutes,
    'total_hours', round(total_hours, 2),
    'active_days', active_days,
    'required_days', 8,
    'required_hours', 20,
    'meets_days', meets_days,
    'meets_hours', meets_hours,
    'base_salary_usd', round(base_salary_usd, 2),
    'penalty_pct', penalty_pct,
    'final_salary_usd', final_salary_usd,
    'agency_id', agency_record.agency_id,
    'agency_name', agency_record.agency_name
  );
END;
$function$;

-- Update agency payroll report -> 15-day cycle
CREATE OR REPLACE FUNCTION public.get_agency_payroll_report(_ref date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  agency_row record;
  cyc record;
  hosts_data jsonb;
  total_salaries numeric := 0;
  agent_commission numeric := 0;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT id, name INTO agency_row FROM agencies WHERE owner_id = caller LIMIT 1;
  IF agency_row.id IS NULL THEN
    RETURN jsonb_build_object('has_agency', false);
  END IF;

  SELECT * INTO cyc FROM get_target_cycle(_ref) LIMIT 1;

  -- 15-day target: 8 days + 1200 minutes (20h)
  WITH host_calc AS (
    SELECT
      am.user_id AS host_id,
      p.display_name,
      p.avatar_url,
      COALESCE((SELECT SUM(diamond_amount) FROM gift_transactions
                WHERE receiver_id = am.user_id
                  AND created_at >= cyc.cycle_start AND created_at < (cyc.cycle_end + 1)), 0) AS diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end), 0) AS minutes,
      COALESCE((SELECT COUNT(*) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
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
$function$;

-- Update boss monthly payroll -> 15-day cycle
CREATE OR REPLACE FUNCTION public.get_boss_monthly_payroll(_ref date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller uuid := auth.uid();
  is_admin boolean;
  cyc record;
  agencies_data jsonb;
  grand_salaries numeric := 0;
  grand_commissions numeric := 0;
BEGIN
  SELECT (has_role(caller,'admin'::app_role) OR has_role(caller,'super_admin'::app_role)) INTO is_admin;
  IF NOT is_admin THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO cyc FROM get_target_cycle(_ref) LIMIT 1;

  WITH per_host AS (
    SELECT
      a.id AS agency_id,
      a.name AS agency_name,
      a.owner_id,
      am.user_id AS host_id,
      COALESCE((SELECT SUM(diamond_amount) FROM gift_transactions
                WHERE receiver_id = am.user_id
                  AND created_at >= cyc.cycle_start AND created_at < (cyc.cycle_end + 1)), 0) AS diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end), 0) AS minutes,
      COALESCE((SELECT COUNT(*) FROM daily_tasks
                WHERE user_id = am.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
                AND room_minutes >= 60), 0) AS active_days
    FROM agencies a
    JOIN agency_members am ON am.agency_id = a.id AND am.badge = 'host'
    WHERE a.is_active = true AND a.status = 'approved'
  ),
  per_agency AS (
    SELECT
      agency_id,
      agency_name,
      owner_id,
      COUNT(*) AS host_count,
      SUM(diamonds) AS total_diamonds,
      SUM(
        CASE WHEN (active_days >= 8 AND minutes >= 1200)
             THEN (diamonds::numeric/100000.0)*8.0
             ELSE (diamonds::numeric/100000.0)*8.0 * 0.8
        END
      ) AS salaries_usd
    FROM per_host
    GROUP BY agency_id, agency_name, owner_id
  )
  SELECT
    COALESCE(jsonb_agg(jsonb_build_object(
      'agency_id', agency_id,
      'agency_name', agency_name,
      'owner_id', owner_id,
      'host_count', host_count,
      'total_diamonds', total_diamonds,
      'salaries_usd', round(salaries_usd, 2),
      'commission_usd', round(salaries_usd * 0.15, 2),
      'grand_total_usd', round(salaries_usd * 1.15, 2)
    ) ORDER BY salaries_usd DESC),'[]'::jsonb),
    COALESCE(SUM(salaries_usd), 0),
    COALESCE(SUM(salaries_usd * 0.15), 0)
  INTO agencies_data, grand_salaries, grand_commissions
  FROM per_agency;

  RETURN jsonb_build_object(
    'cycle_label', cyc.cycle_label,
    'month_start', cyc.cycle_start,
    'month_end', cyc.cycle_end,
    'agencies', agencies_data,
    'grand_salaries_usd', round(grand_salaries, 2),
    'grand_commissions_usd', round(grand_commissions, 2),
    'grand_total_usd', round(grand_salaries + grand_commissions, 2)
  );
END;
$function$;
