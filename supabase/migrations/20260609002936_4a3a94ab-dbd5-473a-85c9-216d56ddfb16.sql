CREATE OR REPLACE FUNCTION public.bd_activate_agency_for_user(_target_public_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  caller_is_bd boolean;
  target_uuid uuid;
  target_name text;
  existing_agency_id uuid;
  new_agency_id uuid;
  existing_bd uuid;
BEGIN
  SELECT is_bd INTO caller_is_bd FROM public.profiles WHERE id = auth.uid();
  IF NOT (COALESCE(caller_is_bd, false)
          OR has_role(auth.uid(), 'admin'::app_role)
          OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Only BD users can activate agencies';
  END IF;

  SELECT id, display_name INTO target_uuid, target_name
  FROM public.profiles WHERE user_id = _target_public_id LIMIT 1;

  IF target_uuid IS NULL THEN
    INSERT INTO public.bd_activity_log (bd_user_id, action_type, target_public_id, status, message)
    VALUES (auth.uid(), 'activate_agency', _target_public_id, 'error', 'User not found');
    RAISE EXCEPTION 'User not found';
  END IF;

  IF target_uuid = auth.uid() THEN
    RAISE EXCEPTION 'Cannot activate agency for yourself';
  END IF;

  SELECT id INTO existing_agency_id FROM public.agencies WHERE owner_id = target_uuid LIMIT 1;

  IF existing_agency_id IS NOT NULL THEN
    SELECT bd_user_id INTO existing_bd FROM public.bd_agencies WHERE agency_id = existing_agency_id LIMIT 1;

    IF existing_bd = auth.uid() THEN
      INSERT INTO public.bd_activity_log (bd_user_id, action_type, target_user_id, target_public_id, target_display_name, agency_id, status, message)
      VALUES (auth.uid(), 'duplicate_attempt', target_uuid, _target_public_id, target_name, existing_agency_id, 'duplicate', 'Agency already activated by this BD');
      RETURN jsonb_build_object('success', false, 'duplicate', true, 'agency_id', existing_agency_id, 'target_user_id', target_uuid, 'target_name', target_name, 'message', 'هذه الوكالة مفعّلة لديك بالفعل');
    END IF;

    IF existing_bd IS NOT NULL AND existing_bd <> auth.uid() THEN
      RAISE EXCEPTION 'هذه الوكالة مرتبطة بـ BD آخر';
    END IF;
  END IF;

  UPDATE public.profiles
  SET agency_eligible = true, is_agent = true
  WHERE id = target_uuid;

  IF existing_agency_id IS NULL THEN
    INSERT INTO public.agencies (name, owner_id, status, is_active)
    VALUES (COALESCE(NULLIF(target_name, ''), 'وكالة ' || _target_public_id), target_uuid, 'approved', true)
    RETURNING id INTO new_agency_id;
  ELSE
    new_agency_id := existing_agency_id;
    UPDATE public.agencies SET is_active = true, status = 'approved' WHERE id = new_agency_id;
  END IF;

  -- Register target as owner/agent member so they can manage hosts
  INSERT INTO public.agency_members (agency_id, user_id, role, badge)
  VALUES (new_agency_id, target_uuid, 'owner', 'agent')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.bd_agencies (bd_user_id, agency_id, activated_by)
  VALUES (auth.uid(), new_agency_id, auth.uid())
  ON CONFLICT (agency_id) DO UPDATE
    SET bd_user_id = auth.uid(), activated_by = auth.uid();

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (target_uuid, 'تم تفعيل وكالتك ✅',
    'تم تفعيل وكالتك بواسطة أحد مطوري الأعمال (BD). يمكنك الآن إدارة الوكالة ودعوة المضيفين.',
    'system');

  INSERT INTO public.bd_activity_log (bd_user_id, action_type, target_user_id, target_public_id, target_display_name, agency_id, status, message)
  VALUES
    (auth.uid(), 'activate_agency', target_uuid, _target_public_id, target_name, new_agency_id, 'success', 'Agency activated'),
    (auth.uid(), 'notification_sent', target_uuid, _target_public_id, target_name, new_agency_id, 'success', 'Activation notification sent');

  RETURN jsonb_build_object('success', true, 'duplicate', false, 'agency_id', new_agency_id, 'target_user_id', target_uuid, 'target_name', target_name);
END;
$function$;

-- Backfill any legacy BD-activated agencies
UPDATE public.agencies a
SET status = 'approved', is_active = true
WHERE a.id IN (SELECT agency_id FROM public.bd_agencies)
  AND (a.status <> 'approved' OR a.is_active = false);

INSERT INTO public.agency_members (agency_id, user_id, role, badge)
SELECT a.id, a.owner_id, 'owner', 'agent'
FROM public.agencies a
WHERE a.id IN (SELECT agency_id FROM public.bd_agencies)
  AND a.owner_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.profiles p
SET is_agent = true, agency_eligible = true
WHERE p.id IN (
  SELECT a.owner_id FROM public.agencies a
  WHERE a.id IN (SELECT agency_id FROM public.bd_agencies) AND a.owner_id IS NOT NULL
);