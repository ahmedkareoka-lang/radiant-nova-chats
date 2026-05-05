
-- Fix: allow sitting on mic in permanent rooms regardless of is_active flag
CREATE OR REPLACE FUNCTION public.validate_mic_access(_user_id uuid, _room_id uuid, _slot integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  room_mic_count integer;
  slot_locked boolean;
  slot_occupied boolean;
  user_banned boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM room_bans WHERE room_id = _room_id AND user_id = _user_id) INTO user_banned;
  IF user_banned THEN RETURN false; END IF;

  SELECT mic_count INTO room_mic_count FROM rooms WHERE id = _room_id;
  IF room_mic_count IS NULL THEN RETURN false; END IF;

  IF _slot < 0 OR _slot >= room_mic_count THEN RETURN false; END IF;

  SELECT _slot = ANY(COALESCE(locked_slots, '{}')) INTO slot_locked FROM rooms WHERE id = _room_id;
  IF slot_locked THEN
    IF NOT EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = _user_id)
       AND NOT has_role(_user_id, 'admin')
    THEN RETURN false; END IF;
  END IF;

  SELECT EXISTS(SELECT 1 FROM room_members WHERE room_id = _room_id AND mic_slot = _slot AND user_id != _user_id) INTO slot_occupied;
  IF slot_occupied THEN RETURN false; END IF;

  IF EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND _user_id = ANY(COALESCE(muted_users, '{}'))) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$function$;

-- Server-side VIP purchase / upgrade
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
  new_expiry timestamptz;
  cur_level integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _level < 1 OR _level > 7 THEN RAISE EXCEPTION 'Invalid VIP level'; END IF;

  -- Hardcoded prices mirror src/lib/vipConfig.ts
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

  -- Stack 30 days when same/lower tier still active, else fresh 30 days
  IF cur_expiry IS NOT NULL AND cur_expiry > now() AND _level <= cur_level THEN
    new_expiry := cur_expiry + interval '30 days';
  ELSE
    new_expiry := now() + interval '30 days';
  END IF;

  UPDATE profiles
     SET coins = coins - price,
         vip_level = GREATEST(_level, COALESCE(cur_level, 0)),
         vip_expiry = new_expiry
   WHERE id = uid;

  -- Add tier frame to inventory (idempotent: skip if already owned)
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

  -- Add VIP perks marker to inventory
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

REVOKE EXECUTE ON FUNCTION public.purchase_vip(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.purchase_vip(integer) TO authenticated;
