
-- 1) BD activity log table
CREATE TABLE IF NOT EXISTS public.bd_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bd_user_id uuid NOT NULL,
  action_type text NOT NULL, -- 'search' | 'activate_agency' | 'duplicate_attempt' | 'notification_sent' | 'error'
  target_user_id uuid,
  target_public_id text,
  target_display_name text,
  agency_id uuid,
  status text NOT NULL DEFAULT 'success', -- 'success' | 'duplicate' | 'error'
  message text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bd_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "BD can read own activity"
ON public.bd_activity_log
FOR SELECT TO authenticated
USING (
  auth.uid() = bd_user_id
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);

CREATE INDEX IF NOT EXISTS idx_bd_activity_bd_user_created
  ON public.bd_activity_log(bd_user_id, created_at DESC);

-- 2) RPC to safely insert log entries (so the app can log searches, etc.)
CREATE OR REPLACE FUNCTION public.log_bd_activity(
  _action_type text,
  _target_user_id uuid DEFAULT NULL,
  _target_public_id text DEFAULT NULL,
  _target_display_name text DEFAULT NULL,
  _agency_id uuid DEFAULT NULL,
  _status text DEFAULT 'success',
  _message text DEFAULT NULL,
  _details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_is_bd boolean;
  new_id uuid;
BEGIN
  SELECT is_bd INTO caller_is_bd FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(caller_is_bd, false)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BD users can log BD activity';
  END IF;

  INSERT INTO public.bd_activity_log (
    bd_user_id, action_type, target_user_id, target_public_id,
    target_display_name, agency_id, status, message, details
  )
  VALUES (
    auth.uid(), _action_type, _target_user_id, _target_public_id,
    _target_display_name, _agency_id, _status, _message, COALESCE(_details, '{}'::jsonb)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- 3) Update activate function: detect duplicates & log every outcome.
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
  existing_bd uuid;
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
    INSERT INTO public.bd_activity_log (
      bd_user_id, action_type, target_public_id, status, message
    ) VALUES (
      auth.uid(), 'activate_agency', _target_public_id, 'error', 'User not found'
    );
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_uuid = auth.uid() THEN
    INSERT INTO public.bd_activity_log (
      bd_user_id, action_type, target_user_id, target_public_id,
      target_display_name, status, message
    ) VALUES (
      auth.uid(), 'activate_agency', target_uuid, _target_public_id,
      target_name, 'error', 'Cannot activate agency for yourself'
    );
    RAISE EXCEPTION 'Cannot activate agency for yourself';
  END IF;

  -- Look for an existing agency owned by the target
  SELECT id INTO existing_agency_id
  FROM public.agencies
  WHERE owner_id = target_uuid
  LIMIT 1;

  -- If an agency exists, check whether it is already linked to a BD
  IF existing_agency_id IS NOT NULL THEN
    SELECT bd_user_id INTO existing_bd
    FROM public.bd_agencies
    WHERE agency_id = existing_agency_id
    LIMIT 1;

    -- Already linked to ME → duplicate, do nothing
    IF existing_bd = auth.uid() THEN
      INSERT INTO public.bd_activity_log (
        bd_user_id, action_type, target_user_id, target_public_id,
        target_display_name, agency_id, status, message
      ) VALUES (
        auth.uid(), 'duplicate_attempt', target_uuid, _target_public_id,
        target_name, existing_agency_id, 'duplicate',
        'Agency already activated by this BD'
      );
      RETURN jsonb_build_object(
        'success', false,
        'duplicate', true,
        'agency_id', existing_agency_id,
        'target_user_id', target_uuid,
        'target_name', target_name,
        'message', 'هذه الوكالة مفعّلة لديك بالفعل'
      );
    END IF;

    -- Linked to a DIFFERENT BD → block
    IF existing_bd IS NOT NULL AND existing_bd <> auth.uid() THEN
      INSERT INTO public.bd_activity_log (
        bd_user_id, action_type, target_user_id, target_public_id,
        target_display_name, agency_id, status, message
      ) VALUES (
        auth.uid(), 'duplicate_attempt', target_uuid, _target_public_id,
        target_name, existing_agency_id, 'error',
        'Agency already linked to another BD'
      );
      RAISE EXCEPTION 'هذه الوكالة مرتبطة بـ BD آخر';
    END IF;
  END IF;

  -- Mark eligibility + agent status
  UPDATE public.profiles
  SET agency_eligible = true,
      is_agent = true
  WHERE id = target_uuid;

  -- Reuse or create agency
  IF existing_agency_id IS NULL THEN
    INSERT INTO public.agencies (name, owner_id, status, is_active)
    VALUES (
      COALESCE(NULLIF(target_name, ''), 'وكالة ' || _target_public_id),
      target_uuid, 'active', true
    )
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

  -- Notify target
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    target_uuid,
    'تم تفعيل وكالتك ✅',
    'تم تفعيل وكالتك بواسطة أحد مطوري الأعمال (BD). يمكنك الآن استقبال المضيفين.',
    'system'
  );

  -- Log success + notification
  INSERT INTO public.bd_activity_log (
    bd_user_id, action_type, target_user_id, target_public_id,
    target_display_name, agency_id, status, message
  ) VALUES
    (auth.uid(), 'activate_agency', target_uuid, _target_public_id,
     target_name, new_agency_id, 'success', 'Agency activated'),
    (auth.uid(), 'notification_sent', target_uuid, _target_public_id,
     target_name, new_agency_id, 'success', 'Activation notification sent');

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'agency_id', new_agency_id,
    'target_user_id', target_uuid,
    'target_name', target_name
  );
END;
$$;
