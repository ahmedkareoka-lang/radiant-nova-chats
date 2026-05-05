-- Add displayed VIP level for users to switch between owned VIPs
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS displayed_vip_level integer;

-- Update purchase_vip: no stacking, always fresh 30 days, blocked if same/higher tier active
CREATE OR REPLACE FUNCTION public.purchase_vip(_level integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  price bigint;
  cur_coins bigint;
  cur_expiry timestamptz;
  cur_level integer;
  new_expiry timestamptz;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _level < 1 OR _level > 7 THEN RAISE EXCEPTION 'Invalid VIP level'; END IF;

  price := CASE _level
    WHEN 1 THEN 1000
    WHEN 2 THEN 5000
    WHEN 3 THEN 15000
    WHEN 4 THEN 50000
    WHEN 5 THEN 150000
    WHEN 6 THEN 500000
    WHEN 7 THEN 2000000
  END;

  SELECT coins, vip_expiry, vip_level
    INTO cur_coins, cur_expiry, cur_level
    FROM profiles WHERE id = uid FOR UPDATE;

  IF cur_coins IS NULL OR cur_coins < price THEN RAISE EXCEPTION 'Insufficient coins'; END IF;

  -- Block re-purchase while a VIP of this level (or higher) is still active
  IF cur_expiry IS NOT NULL AND cur_expiry > now() AND cur_level >= _level THEN
    RAISE EXCEPTION 'VIP already active until %', cur_expiry;
  END IF;

  -- Always a fresh 30-day window (no stacking)
  new_expiry := now() + interval '30 days';

  UPDATE profiles
     SET coins = coins - price,
         vip_level = _level,
         vip_expiry = new_expiry,
         displayed_vip_level = _level
   WHERE id = uid;

  IF NOT EXISTS (
    SELECT 1 FROM inventory
     WHERE user_id = uid AND item_type = 'frame'
       AND item_name = ('إطار VIP ' || _level)
  ) THEN
    INSERT INTO inventory (user_id, item_type, item_name, item_data)
    VALUES (
      uid, 'frame', 'إطار VIP ' || _level,
      jsonb_build_object('frame_url', 'vip-frame-' || _level, 'vip_level', _level, 'special', 'vip')
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM inventory
     WHERE user_id = uid AND item_type = 'vip'
       AND item_name = ('VIP ' || _level)
  ) THEN
    INSERT INTO inventory (user_id, item_type, item_name, item_data)
    VALUES (
      uid, 'vip', 'VIP ' || _level,
      jsonb_build_object('vip_level', _level)
    );
  END IF;

  RETURN jsonb_build_object('vip_level', _level, 'vip_expiry', new_expiry, 'paid', price);
END;
$function$;

-- Update profiles RLS WITH CHECK to include displayed_vip_level as user-controllable
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;
CREATE POLICY "Users can update own safe fields"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (is_boss = (SELECT p.is_boss FROM profiles p WHERE p.id = auth.uid()))
  AND (coins = (SELECT p.coins FROM profiles p WHERE p.id = auth.uid()))
  AND (diamonds = (SELECT p.diamonds FROM profiles p WHERE p.id = auth.uid()))
  AND (vip_level = (SELECT p.vip_level FROM profiles p WHERE p.id = auth.uid()))
  AND (level = (SELECT p.level FROM profiles p WHERE p.id = auth.uid()))
  AND (wealth_xp = (SELECT p.wealth_xp FROM profiles p WHERE p.id = auth.uid()))
  AND (wealth_level = (SELECT p.wealth_level FROM profiles p WHERE p.id = auth.uid()))
  AND (charisma_xp = (SELECT p.charisma_xp FROM profiles p WHERE p.id = auth.uid()))
  AND (charisma_level = (SELECT p.charisma_level FROM profiles p WHERE p.id = auth.uid()))
  AND (is_agent = (SELECT p.is_agent FROM profiles p WHERE p.id = auth.uid()))
  AND (is_host = (SELECT p.is_host FROM profiles p WHERE p.id = auth.uid()))
  AND (NOT (agency_id IS DISTINCT FROM (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid())))
  AND (total_spend_gold = (SELECT p.total_spend_gold FROM profiles p WHERE p.id = auth.uid()))
  AND (nova_p_level = (SELECT p.nova_p_level FROM profiles p WHERE p.id = auth.uid()))
  AND (NOT (nova_p_expiry IS DISTINCT FROM (SELECT p.nova_p_expiry FROM profiles p WHERE p.id = auth.uid())))
  AND (NOT (vip_expiry IS DISTINCT FROM (SELECT p.vip_expiry FROM profiles p WHERE p.id = auth.uid())))
);