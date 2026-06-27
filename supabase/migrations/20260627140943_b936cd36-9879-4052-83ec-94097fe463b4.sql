CREATE OR REPLACE FUNCTION public.increment_agency_mic_hours(_user_id uuid, _hours numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _hours IS NULL OR _hours <= 0 OR _hours > 1 THEN
    RAISE EXCEPTION 'Invalid hours increment';
  END IF;

  UPDATE public.agency_members
     SET mic_hours = COALESCE(mic_hours, 0) + _hours
   WHERE user_id = _user_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid, numeric) TO authenticated;