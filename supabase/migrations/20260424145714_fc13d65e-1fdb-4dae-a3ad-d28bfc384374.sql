
-- Add is_bd flag to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_bd boolean NOT NULL DEFAULT false;

-- BD <-> Agency relationship table (which BD recruited which agency)
CREATE TABLE IF NOT EXISTS public.bd_agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  activated_by uuid NOT NULL, -- BOSS or admin who activated
  total_agency_support bigint NOT NULL DEFAULT 0,
  total_commission_earned bigint NOT NULL DEFAULT 0,
  is_target_reached boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (agency_id) -- each agency can only be assigned to one BD
);

ALTER TABLE public.bd_agencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BD can read own agencies" ON public.bd_agencies
  FOR SELECT TO authenticated
  USING (auth.uid() = bd_user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Admin can manage bd_agencies" ON public.bd_agencies
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- BD commissions log
CREATE TABLE IF NOT EXISTS public.bd_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  agency_support_amount bigint NOT NULL,
  commission_amount bigint NOT NULL,
  period_label text NOT NULL, -- e.g. '2026-04'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bd_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BD can read own commissions" ON public.bd_commissions
  FOR SELECT TO authenticated
  USING (auth.uid() = bd_user_id OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- RPC: Activate BD account (BOSS/admin only)
CREATE OR REPLACE FUNCTION public.activate_bd_account(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_caller_boss boolean;
BEGIN
  -- Only BOSS, admin, or super_admin
  SELECT is_boss INTO is_caller_boss FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(is_caller_boss, false) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BOSS or admins can activate BD accounts';
  END IF;

  UPDATE public.profiles SET is_bd = true WHERE id = _user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, 'تم تفعيلك كـ BD 🟠', 'تم تفعيل حسابك كـ Business Developer. يمكنك الآن إدارة الوكلاء والحصول على عمولة 20%!', 'system');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Deactivate BD account
CREATE OR REPLACE FUNCTION public.deactivate_bd_account(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_caller_boss boolean;
BEGIN
  SELECT is_boss INTO is_caller_boss FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(is_caller_boss, false) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BOSS or admins can deactivate BD accounts';
  END IF;

  UPDATE public.profiles SET is_bd = false WHERE id = _user_id;
  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Assign agency to BD (BOSS/admin only)
CREATE OR REPLACE FUNCTION public.assign_agency_to_bd(_bd_user_id uuid, _agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_caller_boss boolean;
  is_target_bd boolean;
BEGIN
  SELECT is_boss INTO is_caller_boss FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(is_caller_boss, false) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BOSS or admins can assign agencies';
  END IF;

  SELECT is_bd INTO is_target_bd FROM public.profiles WHERE id = _bd_user_id;
  IF NOT COALESCE(is_target_bd, false) THEN
    RAISE EXCEPTION 'Target user is not a BD';
  END IF;

  INSERT INTO public.bd_agencies (bd_user_id, agency_id, activated_by)
  VALUES (_bd_user_id, _agency_id, auth.uid())
  ON CONFLICT (agency_id) DO UPDATE SET bd_user_id = _bd_user_id, activated_by = auth.uid();

  RETURN jsonb_build_object('success', true);
END;
$$;

-- RPC: Calculate BD stats (returns aggregate per BD)
CREATE OR REPLACE FUNCTION public.get_bd_stats(_bd_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  total_support bigint := 0;
  total_commission bigint := 0;
  qualified_count int := 0;
  agency_count int := 0;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(total_agency_support), 0),
    COALESCE(SUM(total_commission_earned), 0),
    COUNT(*) FILTER (WHERE is_target_reached)
  INTO agency_count, total_support, total_commission, qualified_count
  FROM public.bd_agencies WHERE bd_user_id = _bd_user_id;

  RETURN jsonb_build_object(
    'agency_count', agency_count,
    'total_support', total_support,
    'total_commission', total_commission,
    'qualified_count', qualified_count,
    'target_per_agency', 500000,
    'commission_rate', 20
  );
END;
$$;

CREATE INDEX IF NOT EXISTS idx_bd_agencies_bd_user ON public.bd_agencies(bd_user_id);
CREATE INDEX IF NOT EXISTS idx_bd_commissions_bd_user ON public.bd_commissions(bd_user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_bd ON public.profiles(is_bd) WHERE is_bd = true;
