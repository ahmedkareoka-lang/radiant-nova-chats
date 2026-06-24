
-- Add Vanity (Special) ID columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vanity_id text,
  ADD COLUMN IF NOT EXISTS vanity_id_expiry timestamptz;

-- Table to enforce uniqueness of active vanity IDs
CREATE TABLE IF NOT EXISTS public.vanity_ids (
  digits text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.vanity_ids TO authenticated, anon;
GRANT ALL ON public.vanity_ids TO service_role;

ALTER TABLE public.vanity_ids ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read vanity ids" ON public.vanity_ids;
CREATE POLICY "Anyone can read vanity ids" ON public.vanity_ids
  FOR SELECT USING (true);

-- Purchase function — atomic check + reserve + deduct
CREATE OR REPLACE FUNCTION public.purchase_vanity_id(_digits text, _duration_days int)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
  _price bigint;
  _coins bigint;
  _existing record;
  _new_expiry timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  IF _digits !~ '^[0-9]{4}$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_digits');
  END IF;

  IF _duration_days = 7 THEN
    _price := 125000;
  ELSIF _duration_days = 30 THEN
    _price := 1000000;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'invalid_duration');
  END IF;

  _new_expiry := now() + (_duration_days || ' days')::interval;

  -- Check availability
  SELECT * INTO _existing FROM public.vanity_ids WHERE digits = _digits FOR UPDATE;
  IF FOUND AND _existing.expires_at > now() AND _existing.user_id <> _user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'taken');
  END IF;

  -- Check coins
  SELECT coins INTO _coins FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF _coins IS NULL OR _coins < _price THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_coins');
  END IF;

  -- Deduct + assign
  UPDATE public.profiles
    SET coins = coins - _price,
        vanity_id = _digits,
        vanity_id_expiry = _new_expiry
    WHERE id = _user_id;

  -- Reserve digits
  INSERT INTO public.vanity_ids (digits, user_id, expires_at)
    VALUES (_digits, _user_id, _new_expiry)
    ON CONFLICT (digits) DO UPDATE
      SET user_id = EXCLUDED.user_id,
          expires_at = EXCLUDED.expires_at;

  RETURN jsonb_build_object('success', true, 'expires_at', _new_expiry, 'price', _price);
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_vanity_id(text, int) TO authenticated;
