
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS name_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS logo_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.update_agency_profile(
  _new_name TEXT DEFAULT NULL,
  _new_logo_url TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _ag RECORD;
  _now TIMESTAMPTZ := now();
  _cooldown INTERVAL := INTERVAL '15 days';
  _next_name TIMESTAMPTZ;
  _next_logo TIMESTAMPTZ;
  _did_name BOOLEAN := FALSE;
  _did_logo BOOLEAN := FALSE;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthenticated');
  END IF;

  SELECT * INTO _ag FROM public.agencies WHERE owner_id = _uid LIMIT 1;
  IF _ag.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'no_agency');
  END IF;

  IF _new_name IS NOT NULL AND length(btrim(_new_name)) > 0 AND _new_name <> _ag.name THEN
    IF _ag.name_updated_at IS NOT NULL AND _ag.name_updated_at + _cooldown > _now THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'name_cooldown',
        'next_name_change_at', to_char(_ag.name_updated_at + _cooldown, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      );
    END IF;
    UPDATE public.agencies SET name = btrim(_new_name), name_updated_at = _now WHERE id = _ag.id;
    _did_name := TRUE;
  END IF;

  IF _new_logo_url IS NOT NULL AND _new_logo_url <> COALESCE(_ag.logo_url, '') THEN
    IF _ag.logo_updated_at IS NOT NULL AND _ag.logo_updated_at + _cooldown > _now THEN
      RETURN jsonb_build_object(
        'ok', false, 'error', 'logo_cooldown',
        'next_logo_change_at', to_char(_ag.logo_updated_at + _cooldown, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
      );
    END IF;
    UPDATE public.agencies SET logo_url = _new_logo_url, logo_updated_at = _now WHERE id = _ag.id;
    _did_logo := TRUE;
  END IF;

  SELECT name_updated_at, logo_updated_at INTO _ag.name_updated_at, _ag.logo_updated_at
    FROM public.agencies WHERE id = _ag.id;

  _next_name := CASE WHEN _ag.name_updated_at IS NULL THEN NULL ELSE _ag.name_updated_at + _cooldown END;
  _next_logo := CASE WHEN _ag.logo_updated_at IS NULL THEN NULL ELSE _ag.logo_updated_at + _cooldown END;

  RETURN jsonb_build_object(
    'ok', true,
    'updated_name', _did_name,
    'updated_logo', _did_logo,
    'next_name_change_at', _next_name,
    'next_logo_change_at', _next_logo
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_agency_profile(TEXT, TEXT) TO authenticated;
