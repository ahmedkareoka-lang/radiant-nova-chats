-- 1) Eligibility flag for agency creation (granted by BOSS/admin)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_eligible boolean NOT NULL DEFAULT false;

-- Existing owners/agents are implicitly eligible (don't break them)
UPDATE public.profiles
   SET agency_eligible = true
 WHERE id IN (SELECT DISTINCT owner_id FROM public.agencies);

-- 2) Tighten the agency-creation policy: only eligible users (or admins) can insert
DROP POLICY IF EXISTS "Auth can create agency" ON public.agencies;

CREATE POLICY "Eligible users can create agency"
  ON public.agencies
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = owner_id
    AND (
      has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'super_admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.profiles p
         WHERE p.id = auth.uid() AND p.agency_eligible = true
      )
    )
  );

-- 3) BOSS-only RPC to flip the eligibility flag
CREATE OR REPLACE FUNCTION public.set_agency_eligibility(_user_id uuid, _eligible boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  UPDATE public.profiles
     SET agency_eligible = _eligible
   WHERE id = _user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _user_id,
    CASE WHEN _eligible THEN 'تم منحك صلاحية إنشاء وكالة 🏢'
         ELSE 'تم سحب صلاحية إنشاء الوكالة' END,
    CASE WHEN _eligible THEN 'يمكنك الآن التقدم بطلب لإنشاء وكالة من صفحة الوكالات.'
         ELSE 'لم تعد قادراً على إنشاء وكالة جديدة.' END,
    'agency'
  );
END;
$$;

-- 4) RPC: list a user's pending invites with rich context (agency, agent, host's 15-day stats)
CREATE OR REPLACE FUNCTION public.get_my_pending_invites()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  cyc record;
  total_diamonds bigint := 0;
  total_minutes int := 0;
  active_days int := 0;
  invites jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT * INTO cyc FROM get_target_cycle(CURRENT_DATE) LIMIT 1;

  SELECT COALESCE(SUM(diamond_amount),0) INTO total_diamonds
    FROM gift_transactions
    WHERE receiver_id = me
      AND created_at >= cyc.cycle_start
      AND created_at < (cyc.cycle_end + 1);

  SELECT COALESCE(SUM(room_minutes),0) INTO total_minutes
    FROM daily_tasks
    WHERE user_id = me AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end;

  SELECT COUNT(*) INTO active_days
    FROM daily_tasks
    WHERE user_id = me
      AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end
      AND room_minutes >= 60;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'invite_id', i.id,
    'agency_id', i.agency_id,
    'agency_name', a.name,
    'agent_id', i.agent_id,
    'agent_name', ap.display_name,
    'agent_friendly_id', ap.user_id,
    'created_at', i.created_at
  ) ORDER BY i.created_at DESC), '[]'::jsonb)
  INTO invites
  FROM agency_invites i
  JOIN agencies a ON a.id = i.agency_id
  LEFT JOIN profiles ap ON ap.id = i.agent_id
  WHERE i.target_user_id = me AND i.status = 'pending';

  RETURN jsonb_build_object(
    'cycle_label', cyc.cycle_label,
    'cycle_start', cyc.cycle_start,
    'cycle_end',   cyc.cycle_end,
    'host_cycle_diamonds', total_diamonds,
    'host_cycle_minutes',  total_minutes,
    'host_cycle_active_days', active_days,
    'required_days', 8,
    'required_hours', 20,
    'invites', invites
  );
END;
$$;

-- 5) RPC: agent's sent invites (status overview)
CREATE OR REPLACE FUNCTION public.get_my_sent_invites()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  me uuid := auth.uid();
  rows jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'invite_id', i.id,
    'agency_id', i.agency_id,
    'agency_name', a.name,
    'target_id', i.target_user_id,
    'target_name', tp.display_name,
    'target_friendly_id', tp.user_id,
    'avatar_url', tp.avatar_url,
    'status', i.status,
    'created_at', i.created_at
  ) ORDER BY i.created_at DESC), '[]'::jsonb)
  INTO rows
  FROM agency_invites i
  JOIN agencies a ON a.id = i.agency_id
  LEFT JOIN profiles tp ON tp.id = i.target_user_id
  WHERE i.agent_id = me
  LIMIT 100;

  RETURN jsonb_build_object('invites', rows);
END;
$$;