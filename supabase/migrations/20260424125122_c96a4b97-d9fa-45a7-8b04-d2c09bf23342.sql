CREATE OR REPLACE FUNCTION public.cleanup_stale_room_members()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1) Drop from mic anyone whose heartbeat is older than 90 seconds
  UPDATE public.room_members
     SET is_on_mic = false,
         mic_slot = NULL
   WHERE is_on_mic = true
     AND joined_at < (now() - interval '90 seconds');

  -- 2) Remove members whose heartbeat is older than 3 minutes
  DELETE FROM public.room_members
   WHERE joined_at < (now() - interval '3 minutes');

  -- 3) Rooms are permanent — do NOT auto-deactivate empty rooms.
  --    Each host owns ONE persistent room they can re-enter anytime.
END;
$$;