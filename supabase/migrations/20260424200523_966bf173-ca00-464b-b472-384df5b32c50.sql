
-- Update commission rate from 20% to 10% in get_bd_stats
CREATE OR REPLACE FUNCTION public.get_bd_stats(_bd_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
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
    'commission_rate', 10
  );
END;
$$;

-- Update activation notification text to reflect 10%
CREATE OR REPLACE FUNCTION public.activate_bd_account(_user_id uuid)
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
    RAISE EXCEPTION 'Only BOSS or admins can activate BD accounts';
  END IF;

  UPDATE public.profiles SET is_bd = true WHERE id = _user_id;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (_user_id, 'تم تفعيلك كـ BD 🟠', 'تم تفعيل حسابك كـ Business Developer. يمكنك الآن إدارة الوكلاء والحصول على عمولة 10%!', 'system');

  RETURN jsonb_build_object('success', true);
END;
$$;

-- New RPC: BD activates an agency for a user by their 6-digit public user_id.
-- Creates an agency owned by the target user (if not already one), marks them
-- agency_eligible + is_agent, and links it under the calling BD.
CREATE OR REPLACE FUNCTION public.bd_activate_agency_for_user(_target_public_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_bd boolean;
  target_uuid uuid;
  target_name text;
  existing_agency_id uuid;
  new_agency_id uuid;
BEGIN
  -- Caller must be BD (or admin/boss)
  SELECT is_bd INTO caller_is_bd FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(caller_is_bd, false)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BD users can activate agencies';
  END IF;

  -- Find target by 6-digit public user_id
  SELECT id, display_name INTO target_uuid, target_name
  FROM public.profiles
  WHERE user_id = _target_public_id
  LIMIT 1;

  IF target_uuid IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_uuid = auth.uid() THEN
    RAISE EXCEPTION 'Cannot activate agency for yourself';
  END IF;

  -- Mark eligibility + agent status
  UPDATE public.profiles
  SET agency_eligible = true,
      is_agent = true
  WHERE id = target_uuid;

  -- Reuse existing agency owned by target, otherwise create one
  SELECT id INTO existing_agency_id
  FROM public.agencies
  WHERE owner_id = target_uuid
  LIMIT 1;

  IF existing_agency_id IS NULL THEN
    INSERT INTO public.agencies (name, owner_id, status, is_active)
    VALUES (COALESCE(NULLIF(target_name, ''), 'وكالة ' || _target_public_id), target_uuid, 'active', true)
    RETURNING id INTO new_agency_id;
  ELSE
    new_agency_id := existing_agency_id;
    UPDATE public.agencies SET is_active = true, status = 'active' WHERE id = new_agency_id;
  END IF;

  -- Link agency under this BD (one BD per agency)
  INSERT INTO public.bd_agencies (bd_user_id, agency_id, activated_by)
  VALUES (auth.uid(), new_agency_id, auth.uid())
  ON CONFLICT (agency_id) DO UPDATE
    SET bd_user_id = auth.uid(),
        activated_by = auth.uid();

  -- Notify target user
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    target_uuid,
    'تم تفعيل وكالتك ✅',
    'تم تفعيل وكالتك بواسطة أحد مطوري الأعمال (BD). يمكنك الآن استقبال المضيفين.',
    'system'
  );

  RETURN jsonb_build_object(
    'success', true,
    'agency_id', new_agency_id,
    'target_user_id', target_uuid,
    'target_name', target_name
  );
END;
$$;
