
-- ====== room_admins ======
CREATE TABLE IF NOT EXISTS public.room_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.room_admins TO authenticated;
GRANT SELECT ON public.room_admins TO anon;
GRANT ALL ON public.room_admins TO service_role;
ALTER TABLE public.room_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_room_admins" ON public.room_admins
  FOR SELECT USING (true);

CREATE POLICY "host_or_boss_assigns_admins" ON public.room_admins
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS(SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_boss = true)
  );

CREATE POLICY "host_or_boss_removes_admins" ON public.room_admins
  FOR DELETE TO authenticated USING (
    EXISTS(SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.is_boss = true)
  );

-- ====== room_follows ======
CREATE TABLE IF NOT EXISTS public.room_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved')),
  approved_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_follows TO authenticated;
GRANT ALL ON public.room_follows TO service_role;
ALTER TABLE public.room_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_or_host_sees_room"
  ON public.room_follows FOR SELECT TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.room_admins ra WHERE ra.room_id = room_follows.room_id AND ra.user_id = auth.uid())
  );

CREATE POLICY "users_follow_rooms"
  ON public.room_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_unfollow_or_host_removes"
  ON public.room_follows FOR DELETE TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS(SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.room_admins ra WHERE ra.room_id = room_follows.room_id AND ra.user_id = auth.uid())
  );

CREATE POLICY "host_or_admin_approves"
  ON public.room_follows FOR UPDATE TO authenticated USING (
    EXISTS(SELECT 1 FROM public.rooms r WHERE r.id = room_id AND r.host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM public.room_admins ra WHERE ra.room_id = room_follows.room_id AND ra.user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.room_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_admins;

-- ====== helper: is_room_admin ======
CREATE OR REPLACE FUNCTION public.is_room_admin(_room_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.rooms WHERE id = _room_id AND host_id = _user_id
  ) OR EXISTS(
    SELECT 1 FROM public.room_admins WHERE room_id = _room_id AND user_id = _user_id
  ) OR EXISTS(
    SELECT 1 FROM public.profiles WHERE id = _user_id AND is_boss = true
  );
$$;

-- ====== clear_room_chat ======
CREATE OR REPLACE FUNCTION public.clear_room_chat(_room_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_room_admin(_room_id, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  DELETE FROM public.messages WHERE room_id = _room_id;
END; $$;

-- ====== assign / remove admin ======
CREATE OR REPLACE FUNCTION public.assign_room_admin(_room_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rooms WHERE id = _room_id AND host_id = auth.uid())
     AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  INSERT INTO public.room_admins(room_id, user_id, assigned_by)
    VALUES (_room_id, _user_id, auth.uid())
    ON CONFLICT (room_id, user_id) DO NOTHING;
END; $$;

CREATE OR REPLACE FUNCTION public.remove_room_admin(_room_id uuid, _user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.rooms WHERE id = _room_id AND host_id = auth.uid())
     AND NOT EXISTS(SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true) THEN
    RAISE EXCEPTION 'not_owner';
  END IF;
  DELETE FROM public.room_admins WHERE room_id = _room_id AND user_id = _user_id;
END; $$;

-- ====== follow / approve ======
CREATE OR REPLACE FUNCTION public.request_room_follow(_room_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_private boolean;
  _host uuid;
  _status text;
BEGIN
  SELECT is_private, host_id INTO _is_private, _host FROM public.rooms WHERE id = _room_id;
  IF _host = auth.uid() THEN
    RAISE EXCEPTION 'cannot_follow_own_room';
  END IF;
  _status := CASE WHEN COALESCE(_is_private, false) THEN 'pending' ELSE 'approved' END;
  INSERT INTO public.room_follows(room_id, user_id, status, approved_by)
    VALUES (_room_id, auth.uid(), _status, CASE WHEN _status='approved' THEN auth.uid() ELSE NULL END)
    ON CONFLICT (room_id, user_id) DO NOTHING;
  RETURN _status;
END; $$;

CREATE OR REPLACE FUNCTION public.approve_room_follow(_follow_id uuid, _approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rid uuid;
BEGIN
  SELECT room_id INTO _rid FROM public.room_follows WHERE id = _follow_id;
  IF NOT public.is_room_admin(_rid, auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  IF _approve THEN
    UPDATE public.room_follows SET status='approved', approved_by=auth.uid() WHERE id=_follow_id;
  ELSE
    DELETE FROM public.room_follows WHERE id=_follow_id;
  END IF;
END; $$;
