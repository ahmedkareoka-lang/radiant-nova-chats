-- Enable pg_cron if not already
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Function: Auto-remove stale room members
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

  -- 3) Deactivate empty rooms (no members left)
  UPDATE public.rooms r
     SET is_active = false
   WHERE r.is_active = true
     AND NOT EXISTS (
       SELECT 1 FROM public.room_members rm WHERE rm.room_id = r.id
     );
END;
$$;

-- Schedule cleanup every minute
SELECT cron.unschedule('cleanup-stale-room-members')
 WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-stale-room-members');

SELECT cron.schedule(
  'cleanup-stale-room-members',
  '* * * * *',
  $$ SELECT public.cleanup_stale_room_members(); $$
);