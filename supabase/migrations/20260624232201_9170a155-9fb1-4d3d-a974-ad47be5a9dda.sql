
-- Sweep expired vanity IDs: clear from profiles and from vanity_ids table
CREATE OR REPLACE FUNCTION public.sweep_expired_vanity_ids()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET vanity_id = NULL, vanity_id_expiry = NULL
  WHERE vanity_id_expiry IS NOT NULL AND vanity_id_expiry < now();

  DELETE FROM public.vanity_ids WHERE expires_at < now();
END;
$$;

-- Schedule hourly sweep (pg_cron)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  PERFORM cron.unschedule('sweep-expired-vanity-ids');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'sweep-expired-vanity-ids',
  '*/15 * * * *',
  $$SELECT public.sweep_expired_vanity_ids();$$
);
