CREATE UNIQUE INDEX IF NOT EXISTS agencies_owner_unique
  ON public.agencies (owner_id);

CREATE UNIQUE INDEX IF NOT EXISTS agency_members_user_unique
  ON public.agency_members (user_id);

CREATE OR REPLACE FUNCTION public.get_target_cycle(_ref date DEFAULT CURRENT_DATE)
RETURNS TABLE(cycle_start date, cycle_end date, cycle_label text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  d int := EXTRACT(DAY FROM _ref)::int;
  y int := EXTRACT(YEAR FROM _ref)::int;
  m int := EXTRACT(MONTH FROM _ref)::int;
  s date; e date;
BEGIN
  IF d <= 15 THEN
    s := make_date(y,m,1); e := make_date(y,m,15);
  ELSE
    s := make_date(y,m,16);
    e := (make_date(y,m,1) + INTERVAL '1 month - 1 day')::date;
  END IF;
  RETURN QUERY SELECT s, e, to_char(s,'DD Mon') || ' - ' || to_char(e,'DD Mon');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_agent_transfer_stats()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  is_admin boolean;
  today_total bigint := 0; today_count int := 0;
  week_total bigint := 0;  week_count int := 0;
  week_start date; per_agent jsonb;
BEGIN
  SELECT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
    INTO is_admin;
  IF NOT is_admin THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  week_start := (CURRENT_DATE - ((EXTRACT(DOW FROM CURRENT_DATE)::int + 1) % 7))::date;

  SELECT COALESCE(SUM(amount),0), COUNT(*) INTO today_total, today_count
    FROM agent_transfer_log
    WHERE created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1;

  SELECT COALESCE(SUM(amount),0), COUNT(*) INTO week_total, week_count
    FROM agent_transfer_log WHERE created_at >= week_start;

  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb) INTO per_agent FROM (
    SELECT
      ra.user_id, ra.agent_name, p.coins AS current_balance,
      COALESCE(SUM(CASE WHEN l.created_at >= CURRENT_DATE AND l.created_at < CURRENT_DATE + 1 THEN l.amount END),0) AS today_amount,
      COUNT(   CASE WHEN l.created_at >= CURRENT_DATE AND l.created_at < CURRENT_DATE + 1 THEN 1 END)               AS today_transfers,
      COALESCE(SUM(CASE WHEN l.created_at >= week_start THEN l.amount END),0) AS week_amount,
      COUNT(   CASE WHEN l.created_at >= week_start THEN 1 END)               AS week_transfers,
      COALESCE(SUM(l.amount),0) AS lifetime_amount,
      COUNT(l.id)               AS lifetime_transfers
    FROM recharge_agents ra
    LEFT JOIN profiles p ON p.id = ra.user_id
    LEFT JOIN agent_transfer_log l ON l.agent_id = ra.user_id
    WHERE ra.is_active = true
    GROUP BY ra.user_id, ra.agent_name, p.coins
    ORDER BY today_amount DESC, week_amount DESC
  ) t;

  RETURN jsonb_build_object(
    'today_total', today_total, 'today_count', today_count,
    'week_total', week_total, 'week_count', week_count,
    'week_start', week_start, 'per_agent', per_agent
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_host_agency_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  m_agency_id uuid; m_total_support bigint; m_mic_hours numeric;
  today_diamonds bigint := 0; today_minutes int := 0;
  cycle_diamonds bigint := 0; cycle_minutes int := 0;
  cyc record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT agency_id, total_support, mic_hours INTO m_agency_id, m_total_support, m_mic_hours
    FROM agency_members WHERE user_id = me;
  IF m_agency_id IS NULL THEN RETURN jsonb_build_object('has_agency', false); END IF;

  SELECT * INTO cyc FROM get_target_cycle(CURRENT_DATE) LIMIT 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO today_diamonds
    FROM gift_transactions
    WHERE receiver_id = me AND created_at >= CURRENT_DATE AND created_at < CURRENT_DATE + 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO cycle_diamonds
    FROM gift_transactions
    WHERE receiver_id = me AND created_at >= cyc.cycle_start;

  SELECT COALESCE(room_minutes,0) INTO today_minutes
    FROM daily_tasks WHERE user_id = me AND task_date = CURRENT_DATE;

  SELECT COALESCE(SUM(room_minutes),0) INTO cycle_minutes
    FROM daily_tasks WHERE user_id = me AND task_date >= cyc.cycle_start;

  RETURN jsonb_build_object(
    'has_agency', true, 'agency_id', m_agency_id,
    'today_diamonds', today_diamonds, 'today_minutes', today_minutes,
    'cycle_label', cyc.cycle_label, 'cycle_start', cyc.cycle_start, 'cycle_end', cyc.cycle_end,
    'cycle_diamonds', cycle_diamonds, 'cycle_minutes', cycle_minutes,
    'lifetime_support', m_total_support, 'lifetime_mic_hours', m_mic_hours
  );
END;
$$;