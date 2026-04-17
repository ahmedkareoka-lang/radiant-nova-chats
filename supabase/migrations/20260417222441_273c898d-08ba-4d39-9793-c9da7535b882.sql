-- 1. Add NOVA P columns to profiles (vip_level & equipped_frame already exist)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS total_spend_gold BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nova_p_level INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS nova_p_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS vip_expiry TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS equipped_name_style TEXT,
  ADD COLUMN IF NOT EXISTS equipped_entrance_effect TEXT,
  ADD COLUMN IF NOT EXISTS equipped_chat_bubble TEXT;

-- 2. Index for expiry sweeps
CREATE INDEX IF NOT EXISTS idx_profiles_nova_expiry ON public.profiles(nova_p_expiry);
CREATE INDEX IF NOT EXISTS idx_profiles_vip_expiry  ON public.profiles(vip_expiry);

-- 3. Tier resolver
CREATE OR REPLACE FUNCTION public.get_nova_p_tier(gold_amount BIGINT)
RETURNS TABLE(level INT, duration_days INT)
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF gold_amount >= 10000000 THEN RETURN QUERY SELECT 6, 240;
  ELSIF gold_amount >=  7000000 THEN RETURN QUERY SELECT 5, 150;
  ELSIF gold_amount >=  2000000 THEN RETURN QUERY SELECT 4,  90;
  ELSIF gold_amount >=   800000 THEN RETURN QUERY SELECT 3,  60;
  ELSIF gold_amount >=   100000 THEN RETURN QUERY SELECT 2,  30;
  ELSIF gold_amount >=    40000 THEN RETURN QUERY SELECT 1,  30;
  ELSE RETURN QUERY SELECT 0, 0;
  END IF;
END;
$$;

-- 4. Recompute NOVA P tier for a user from their lifetime spend
CREATE OR REPLACE FUNCTION public.recompute_nova_p(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spend BIGINT;
  tier RECORD;
BEGIN
  SELECT total_spend_gold INTO spend FROM profiles WHERE id = _user_id;
  IF spend IS NULL THEN RETURN; END IF;

  SELECT * INTO tier FROM get_nova_p_tier(spend) LIMIT 1;

  UPDATE profiles
     SET nova_p_level  = tier.level,
         nova_p_expiry = CASE
                           WHEN tier.level > 0 THEN now() + (tier.duration_days || ' days')::interval
                           ELSE NULL
                         END
   WHERE id = _user_id
     AND (nova_p_level < tier.level OR nova_p_expiry IS NULL OR nova_p_expiry < now());
END;
$$;

-- 5. Sweep job: downgrade expired NOVA P + VIP
CREATE OR REPLACE FUNCTION public.sweep_expired_perks()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles
     SET nova_p_level = 0, nova_p_expiry = NULL
   WHERE nova_p_expiry IS NOT NULL AND nova_p_expiry < now();

  UPDATE profiles
     SET vip_level = 0, vip_expiry = NULL
   WHERE vip_expiry IS NOT NULL AND vip_expiry < now();
END;
$$;

-- 6. Update the gift sender path: when gold is spent on gifts, accumulate total_spend_gold and recompute tier
CREATE OR REPLACE FUNCTION public.on_gift_sent_accumulate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gold_amount > 0 THEN
    UPDATE profiles
       SET total_spend_gold = total_spend_gold + NEW.gold_amount
     WHERE id = NEW.sender_id;
    PERFORM recompute_nova_p(NEW.sender_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gift_accumulate ON public.gift_transactions;
CREATE TRIGGER trg_gift_accumulate
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.on_gift_sent_accumulate();

-- 7. Backfill total_spend_gold from existing gift_transactions
UPDATE public.profiles p
   SET total_spend_gold = COALESCE(t.sum_gold, 0)
  FROM (
    SELECT sender_id, SUM(gold_amount)::BIGINT AS sum_gold
      FROM public.gift_transactions
     GROUP BY sender_id
  ) t
 WHERE p.id = t.sender_id;

-- Recompute tier for all users with spend
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM profiles WHERE total_spend_gold > 0 LOOP
    PERFORM recompute_nova_p(r.id);
  END LOOP;
END $$;

-- 8. Extend the safe profile-update RLS policy to allow editing the new equipped_* fields while still locking economic fields
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND is_boss          = (SELECT p.is_boss          FROM profiles p WHERE p.id = auth.uid())
  AND coins            = (SELECT p.coins            FROM profiles p WHERE p.id = auth.uid())
  AND diamonds         = (SELECT p.diamonds         FROM profiles p WHERE p.id = auth.uid())
  AND vip_level        = (SELECT p.vip_level        FROM profiles p WHERE p.id = auth.uid())
  AND level            = (SELECT p.level            FROM profiles p WHERE p.id = auth.uid())
  AND wealth_xp        = (SELECT p.wealth_xp        FROM profiles p WHERE p.id = auth.uid())
  AND wealth_level     = (SELECT p.wealth_level     FROM profiles p WHERE p.id = auth.uid())
  AND charisma_xp      = (SELECT p.charisma_xp      FROM profiles p WHERE p.id = auth.uid())
  AND charisma_level   = (SELECT p.charisma_level   FROM profiles p WHERE p.id = auth.uid())
  AND is_agent         = (SELECT p.is_agent         FROM profiles p WHERE p.id = auth.uid())
  AND is_host          = (SELECT p.is_host          FROM profiles p WHERE p.id = auth.uid())
  AND NOT (agency_id   IS DISTINCT FROM (SELECT p.agency_id        FROM profiles p WHERE p.id = auth.uid()))
  AND total_spend_gold = (SELECT p.total_spend_gold FROM profiles p WHERE p.id = auth.uid())
  AND nova_p_level     = (SELECT p.nova_p_level     FROM profiles p WHERE p.id = auth.uid())
  AND NOT (nova_p_expiry IS DISTINCT FROM (SELECT p.nova_p_expiry  FROM profiles p WHERE p.id = auth.uid()))
  AND NOT (vip_expiry    IS DISTINCT FROM (SELECT p.vip_expiry     FROM profiles p WHERE p.id = auth.uid()))
);

-- 9. Schedule sweep every hour (pg_cron). Skip silently if extension absent.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('sweep_expired_perks_hourly') 
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sweep_expired_perks_hourly');
    PERFORM cron.schedule('sweep_expired_perks_hourly', '0 * * * *', $cron$SELECT public.sweep_expired_perks();$cron$);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;