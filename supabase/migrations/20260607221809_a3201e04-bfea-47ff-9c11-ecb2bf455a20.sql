CREATE OR REPLACE FUNCTION public.apply_telegram_referral(_user_id uuid, _referrer_telegram_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referrer uuid;
  signup_reward bigint := 500;
  inviter_reward bigint := 500;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF EXISTS (SELECT 1 FROM referrals WHERE referred_id = _user_id) THEN
    RAISE EXCEPTION 'Already used a referral code';
  END IF;

  SELECT id INTO referrer FROM profiles WHERE telegram_id = _referrer_telegram_id LIMIT 1;
  IF referrer IS NULL THEN
    RAISE EXCEPTION 'Invalid referrer';
  END IF;

  IF referrer = _user_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  INSERT INTO referrals (referrer_id, referred_id, signup_reward_claimed)
  VALUES (referrer, _user_id, true);

  -- Reward referred user
  UPDATE profiles SET coins = coins + signup_reward WHERE id = _user_id;

  -- Reward inviter (the Telegram-shared link reward)
  UPDATE profiles SET coins = coins + inviter_reward WHERE id = referrer;

  -- Track in referral_codes if the inviter has one
  UPDATE referral_codes
     SET uses_count = uses_count + 1,
         total_earned_coins = total_earned_coins + inviter_reward
   WHERE user_id = referrer;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (referrer, '👥 صديق جديد انضم عبر تيليجرام!',
          'استخدم رابط الدعوة بتاعك على تيليجرام · +' || inviter_reward || ' كوينز', 'referral');

  RETURN jsonb_build_object('signup_reward', signup_reward, 'inviter_reward', inviter_reward, 'referrer_id', referrer);
END;
$function$;