-- 1) Audit log table
CREATE TABLE IF NOT EXISTS public.payroll_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  target_user_id UUID,
  action_type TEXT NOT NULL, -- 'policy_change' | 'gift_unlock' | 'gift_transfer' | 'target_adjustment'
  description TEXT NOT NULL,
  diamond_amount BIGINT DEFAULT 0,
  coin_amount BIGINT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_audit_target ON public.payroll_audit_log(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_audit_action ON public.payroll_audit_log(action_type, created_at DESC);

ALTER TABLE public.payroll_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can read audit log"
  ON public.payroll_audit_log FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Agency owner can read audit for their hosts"
  ON public.payroll_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM agency_members am
      JOIN agencies a ON a.id = am.agency_id
      WHERE am.user_id = payroll_audit_log.target_user_id
        AND a.owner_id = auth.uid()
    )
  );

CREATE POLICY "Host can read own audit"
  ON public.payroll_audit_log FOR SELECT
  TO authenticated
  USING (auth.uid() = target_user_id);

-- 2) Logger RPC
CREATE OR REPLACE FUNCTION public.log_payroll_audit(
  _target_user_id UUID,
  _action_type TEXT,
  _description TEXT,
  _diamond_amount BIGINT DEFAULT 0,
  _coin_amount BIGINT DEFAULT 0,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  caller UUID := auth.uid();
  is_admin BOOLEAN;
  new_id UUID;
BEGIN
  IF caller IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT (has_role(caller,'admin'::app_role) OR has_role(caller,'super_admin'::app_role)) INTO is_admin;

  -- Allow: admins always, or self-actions (gift_unlock by the host)
  IF NOT (is_admin OR caller = _target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  INSERT INTO payroll_audit_log (actor_id, target_user_id, action_type, description, diamond_amount, coin_amount, metadata)
  VALUES (caller, _target_user_id, _action_type, _description, _diamond_amount, _coin_amount, _metadata)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 3) Alternative 15-day cycle starting on day 30 (30→14 and 15→29)
CREATE OR REPLACE FUNCTION public.get_target_cycle_alt(_ref date DEFAULT CURRENT_DATE)
RETURNS TABLE(cycle_start date, cycle_end date, cycle_label text)
LANGUAGE plpgsql IMMUTABLE SET search_path = public
AS $$
DECLARE
  d int := EXTRACT(DAY FROM _ref)::int;
  y int := EXTRACT(YEAR FROM _ref)::int;
  m int := EXTRACT(MONTH FROM _ref)::int;
  s date; e date;
  prev_month_last date;
  next_month date;
BEGIN
  -- Cycle A: starts day 30 of previous month → day 14 current
  -- Cycle B: starts day 15 → day 29 current month
  IF d >= 15 AND d <= 29 THEN
    s := make_date(y,m,15);
    e := make_date(y,m,29);
  ELSE
    -- Either d <= 14 (started day 30 of prev month) or d >= 30 (just started)
    IF d >= 30 THEN
      s := make_date(y,m,30);
      next_month := (make_date(y,m,1) + INTERVAL '1 month')::date;
      e := (next_month + INTERVAL '13 days')::date;
    ELSE
      -- d <= 14: cycle started day 30 of previous month
      prev_month_last := (make_date(y,m,1) - INTERVAL '1 day')::date;
      -- Use day 30 if it exists, otherwise last day of prev month
      IF EXTRACT(DAY FROM prev_month_last)::int >= 30 THEN
        s := make_date(EXTRACT(YEAR FROM prev_month_last)::int, EXTRACT(MONTH FROM prev_month_last)::int, 30);
      ELSE
        s := prev_month_last;
      END IF;
      e := make_date(y,m,14);
    END IF;
  END IF;
  RETURN QUERY SELECT s, e, to_char(s,'DD Mon') || ' - ' || to_char(e,'DD Mon');
END;
$$;

-- 4) Salary details with daily breakdown + cycle mode
CREATE OR REPLACE FUNCTION public.get_host_salary_details(
  _host_id UUID DEFAULT NULL,
  _ref date DEFAULT CURRENT_DATE,
  _cycle_mode TEXT DEFAULT 'standard'  -- 'standard' or 'alt30'
) RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  target_id UUID := COALESCE(_host_id, auth.uid());
  caller UUID := auth.uid();
  is_admin BOOLEAN;
  is_self BOOLEAN;
  is_agent_of_host BOOLEAN;
  cyc RECORD;
  daily_breakdown JSONB;
  audit_entries JSONB;
  total_diamonds BIGINT := 0;
  total_minutes INT := 0;
  active_days INT := 0;
  total_hours NUMERIC;
  base_salary_usd NUMERIC;
  meets_days BOOLEAN;
  meets_hours BOOLEAN;
  penalty_pct INT := 0;
  final_salary_usd NUMERIC;
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

  -- Pick cycle window
  IF _cycle_mode = 'alt30' THEN
    SELECT * INTO cyc FROM get_target_cycle_alt(_ref) LIMIT 1;
  ELSE
    SELECT * INTO cyc FROM get_target_cycle(_ref) LIMIT 1;
  END IF;

  -- Aggregate
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
  meets_days := active_days >= 8;
  meets_hours := total_hours >= 20;
  IF NOT (meets_days AND meets_hours) THEN penalty_pct := 20; END IF;
  final_salary_usd := round(base_salary_usd * (1 - penalty_pct/100.0), 2);

  -- Daily breakdown (per day in cycle)
  WITH days AS (
    SELECT generate_series(cyc.cycle_start, cyc.cycle_end, '1 day'::interval)::date AS day
  ),
  diamonds AS (
    SELECT date_trunc('day', created_at)::date AS day, SUM(diamond_amount) AS d
    FROM gift_transactions
    WHERE receiver_id = target_id
      AND created_at >= cyc.cycle_start AND created_at < (cyc.cycle_end + 1)
    GROUP BY 1
  ),
  minutes AS (
    SELECT task_date AS day, room_minutes AS m
    FROM daily_tasks
    WHERE user_id = target_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'date', d.day,
    'diamonds', COALESCE(diamonds.d, 0),
    'minutes', COALESCE(minutes.m, 0),
    'is_active', COALESCE(minutes.m,0) >= 60
  ) ORDER BY d.day), '[]'::jsonb)
  INTO daily_breakdown
  FROM days d
  LEFT JOIN diamonds ON diamonds.day = d.day
  LEFT JOIN minutes  ON minutes.day  = d.day;

  -- Recent audit entries (last 50)
  SELECT COALESCE(jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC), '[]'::jsonb)
  INTO audit_entries
  FROM (
    SELECT id, actor_id, action_type, description, diamond_amount, coin_amount, metadata, created_at
    FROM payroll_audit_log
    WHERE target_user_id = target_id
      AND created_at >= cyc.cycle_start
    ORDER BY created_at DESC
    LIMIT 50
  ) a;

  RETURN jsonb_build_object(
    'host_id', target_id,
    'cycle_mode', _cycle_mode,
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end', cyc.cycle_end,
    'total_diamonds', total_diamonds,
    'total_minutes', total_minutes,
    'total_hours', round(total_hours,2),
    'active_days', active_days,
    'required_days', 8,
    'required_hours', 20,
    'meets_days', meets_days,
    'meets_hours', meets_hours,
    'base_salary_usd', round(base_salary_usd,2),
    'penalty_pct', penalty_pct,
    'final_salary_usd', final_salary_usd,
    'daily_breakdown', daily_breakdown,
    'audit_log', audit_entries
  );
END;
$$;