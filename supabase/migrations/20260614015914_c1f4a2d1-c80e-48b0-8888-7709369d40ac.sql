
-- Kick a user out of a room (host or BOSS only)
CREATE OR REPLACE FUNCTION public.admin_kick_user(_room_id uuid, _target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT (
    EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
  ) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  DELETE FROM room_members WHERE room_id = _room_id AND user_id = _target_user;
END;
$$;

-- Force user off the mic (host or BOSS only)
CREATE OR REPLACE FUNCTION public.admin_kick_from_mic(_room_id uuid, _target_user uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
BEGIN
  SELECT (
    EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
  ) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE room_members
     SET mic_slot = NULL, is_on_mic = false
   WHERE room_id = _room_id AND user_id = _target_user;
END;
$$;

-- Toggle force-mute for a user (host or BOSS only) — atomic on rooms.muted_users
CREATE OR REPLACE FUNCTION public.admin_toggle_mute_user(_room_id uuid, _target_user uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  allowed boolean;
  current_arr uuid[];
  now_muted boolean;
BEGIN
  SELECT (
    EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid())
    OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
  ) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  SELECT COALESCE(muted_users, '{}') INTO current_arr FROM rooms WHERE id = _room_id;
  IF _target_user = ANY(current_arr) THEN
    UPDATE rooms SET muted_users = array_remove(current_arr, _target_user) WHERE id = _room_id;
    now_muted := false;
  ELSE
    UPDATE rooms SET muted_users = array_append(current_arr, _target_user) WHERE id = _room_id;
    now_muted := true;
  END IF;
  RETURN now_muted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_kick_user(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_kick_from_mic(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_toggle_mute_user(uuid, uuid) TO authenticated;
