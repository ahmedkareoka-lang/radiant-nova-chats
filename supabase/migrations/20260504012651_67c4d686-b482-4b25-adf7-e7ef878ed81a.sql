
CREATE OR REPLACE FUNCTION public.deduct_coins_add_wealth(_user_id uuid, _coin_amount bigint, _xp_amount bigint)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  current_coins bigint; new_xp bigint; new_level integer;
  remaining_xp bigint; lvl integer; threshold bigint;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _coin_amount IS NULL OR _coin_amount < 0 OR _xp_amount IS NULL OR _xp_amount < 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT coins INTO current_coins FROM profiles WHERE id = _user_id;
  IF current_coins < _coin_amount THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
  SELECT wealth_xp + _xp_amount INTO new_xp FROM profiles WHERE id = _user_id;
  remaining_xp := new_xp; lvl := 0;
  LOOP
    IF lvl < 10 THEN threshold := 25000;
    ELSIF lvl < 20 THEN threshold := 40000;
    ELSIF lvl < 30 THEN threshold := 65000;
    ELSIF lvl < 40 THEN threshold := 100000;
    ELSIF lvl < 50 THEN threshold := 150000;
    ELSIF lvl < 60 THEN threshold := 300000;
    ELSIF lvl < 70 THEN threshold := 500000;
    ELSIF lvl < 80 THEN threshold := 750000;
    ELSIF lvl < 90 THEN threshold := 1000000;
    ELSE threshold := 1500000;
    END IF;
    IF remaining_xp < threshold OR lvl >= 100 THEN EXIT; END IF;
    remaining_xp := remaining_xp - threshold; lvl := lvl + 1;
  END LOOP;
  new_level := GREATEST(1, lvl);
  UPDATE profiles SET coins = coins - _coin_amount, wealth_xp = new_xp, wealth_level = new_level WHERE id = _user_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.add_diamonds_add_charisma(uuid, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.process_referral_recharge(uuid, bigint) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _admin_id uuid, _target_id uuid,
  _coins bigint DEFAULT NULL, _diamonds bigint DEFAULT NULL,
  _vip_level integer DEFAULT NULL, _is_boss boolean DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE caller_is_boss boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COALESCE(is_boss, false) INTO caller_is_boss FROM profiles WHERE id = auth.uid();
  IF NOT (caller_is_boss OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role)) THEN
    RAISE EXCEPTION 'Unauthorized: boss/admin only';
  END IF;
  UPDATE profiles SET
    coins = COALESCE(_coins, coins),
    diamonds = COALESCE(_diamonds, diamonds),
    vip_level = COALESCE(_vip_level, vip_level),
    is_boss = COALESCE(_is_boss, is_boss)
  WHERE id = _target_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.send_gift_atomic(
  _receiver_id uuid, _gold_amount bigint, _gift_name text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE sender uuid := auth.uid(); rate int; diamond_amount bigint; cur_coins bigint;
BEGIN
  IF sender IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _gold_amount IS NULL OR _gold_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF sender = _receiver_id THEN RAISE EXCEPTION 'Cannot gift yourself'; END IF;
  SELECT coins INTO cur_coins FROM profiles WHERE id = sender FOR UPDATE;
  IF cur_coins IS NULL OR cur_coins < _gold_amount THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
  SELECT COALESCE(NULLIF(value,'')::int, 50) INTO rate FROM system_settings WHERE key = 'gift_conversion_rate';
  rate := COALESCE(rate, 50);
  diamond_amount := floor((_gold_amount * rate) / 100.0)::bigint;
  PERFORM public.deduct_coins_add_wealth(sender, _gold_amount, _gold_amount);
  PERFORM public.add_diamonds_add_charisma(_receiver_id, diamond_amount, diamond_amount);
  RETURN jsonb_build_object('diamond_amount', diamond_amount, 'gold_amount', _gold_amount);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.send_gift_atomic(uuid, bigint, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_update_profile(uuid,uuid,bigint,bigint,integer,boolean) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_update_profile(uuid,uuid,bigint,bigint,integer,boolean) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.deduct_coins_add_wealth(uuid,bigint,bigint) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.deduct_coins_add_wealth(uuid,bigint,bigint) TO authenticated;

DROP POLICY IF EXISTS "Authenticated can upload to assets" ON storage.objects;

REVOKE SELECT (phone) ON public.profiles FROM authenticated, anon;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true)
AS SELECT
  id, display_name, user_id, avatar_url, vip_level, vip_expiry, country_code,
  gender, level, is_boss, equipped_frame, equipped_badge, wealth_level,
  charisma_level, nova_p_level, nova_p_expiry, is_host, is_agent, is_bd,
  agency_id, cover_url, created_at
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO authenticated, anon;
