
-- ========================================
-- 1) Storage: remove broad public SELECT/listing on assets bucket
-- Public bucket files remain accessible via direct URL (bucket.public=true),
-- but anonymous LIST queries are no longer allowed.
-- ========================================
DROP POLICY IF EXISTS "Allow Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Public can read assets" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read assets" ON storage.objects;

-- Keep an authenticated-only read policy so app users can read via SDK if needed
CREATE POLICY "Authenticated can read assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'assets');

-- ========================================
-- 2) Lock down SECURITY DEFINER functions
-- Strategy:
--   a) Revoke EXECUTE from anon on ALL listed definer functions
--   b) Revoke EXECUTE from PUBLIC and authenticated on internal/trigger/cron functions
-- ========================================

-- Helper: revoke from anon, public on every public schema definer function
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon, PUBLIC',
                   r.proname, r.args);
  END LOOP;
END $$;

-- Internal / trigger / cron-only functions: also revoke from authenticated
DO $$
DECLARE
  fn TEXT;
  internal_fns TEXT[] := ARRAY[
    'handle_new_user',
    'notify_gift_received',
    'on_gift_sent_accumulate',
    'notify_agency_invite_change',
    'sync_agent_flag_from_agency',
    'sync_boss_admin_role',
    'sync_boss_admin_role_insert',
    'sync_host_flag_from_membership',
    'update_couple_love_score',
    'update_love_points_on_gift',
    'log_payroll_audit',
    'log_bd_activity',
    'recompute_nova_p',
    'record_nova_p_monthly',
    'sweep_expired_perks',
    'cleanup_stale_room_members',
    'validate_mic_access',
    'admin_update_profile',
    'set_agency_eligibility',
    'sync_boss_admin_role'
  ];
  r RECORD;
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    FOR r IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated, PUBLIC, anon',
                     fn, r.args);
    END LOOP;
  END LOOP;
END $$;
