
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS follows_require_approval boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.request_room_follow(_room_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _needs_approval boolean;
  _host uuid;
  _status text;
BEGIN
  SELECT follows_require_approval, host_id INTO _needs_approval, _host FROM public.rooms WHERE id = _room_id;
  IF _host = auth.uid() THEN
    RAISE EXCEPTION 'cannot_follow_own_room';
  END IF;
  _status := CASE WHEN COALESCE(_needs_approval, false) THEN 'pending' ELSE 'approved' END;
  INSERT INTO public.room_follows(room_id, user_id, status, approved_by)
    VALUES (_room_id, auth.uid(), _status, CASE WHEN _status='approved' THEN auth.uid() ELSE NULL END)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _status;
END; $$;
