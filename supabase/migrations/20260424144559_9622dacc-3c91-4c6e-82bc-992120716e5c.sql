CREATE OR REPLACE FUNCTION public.gift_diamonds_as_coins_to_user(_recipient_user_id text, _diamond_amount bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender uuid := auth.uid();
  recipient_id uuid;
  recipient_name text;
  sender_name text;
  sender_diamonds bigint;
  rate_text text;
  rate_int int := 100;
  coin_amount bigint;
BEGIN
  IF sender IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _diamond_amount IS NULL OR _diamond_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  SELECT id, display_name INTO recipient_id, recipient_name
    FROM public.profiles WHERE user_id = _recipient_user_id;
  IF recipient_id IS NULL THEN RAISE EXCEPTION 'Recipient not found'; END IF;
  IF recipient_id = sender THEN RAISE EXCEPTION 'Cannot transfer to yourself'; END IF;

  SELECT diamonds, display_name INTO sender_diamonds, sender_name
    FROM public.profiles WHERE id = sender;
  IF sender_diamonds IS NULL OR sender_diamonds < _diamond_amount THEN
    RAISE EXCEPTION 'Insufficient diamonds';
  END IF;

  -- Use platform exchange rate (diamonds → coins). Default 100 = 1:1.
  SELECT value INTO rate_text FROM public.system_settings WHERE key = 'exchange_rate';
  IF rate_text IS NOT NULL THEN
    BEGIN rate_int := rate_text::int; EXCEPTION WHEN others THEN rate_int := 100; END;
  END IF;

  coin_amount := floor((_diamond_amount::numeric * rate_int) / 100.0)::bigint;
  IF coin_amount <= 0 THEN RAISE EXCEPTION 'Computed coin amount is zero'; END IF;

  UPDATE public.profiles SET diamonds = diamonds - _diamond_amount WHERE id = sender;
  UPDATE public.profiles SET coins = coins + coin_amount WHERE id = recipient_id;

  INSERT INTO public.notifications (user_id, title, message, type) VALUES
    (recipient_id, '💰 هدية ذهبية!',
      'استلمت ' || coin_amount || ' NOVA Coin هدية من ' || COALESCE(sender_name, 'مستخدم'),
      'transfer'),
    (sender, '✅ تم الإرسال',
      'تم تحويل ' || _diamond_amount || ' ماسة إلى ' || coin_amount || ' Coin إلى ' || COALESCE(recipient_name, 'مستخدم'),
      'transfer');

  RETURN jsonb_build_object(
    'recipient_id', recipient_id,
    'recipient_name', recipient_name,
    'diamond_amount', _diamond_amount,
    'coin_amount', coin_amount,
    'rate', rate_int,
    'new_diamond_balance', sender_diamonds - _diamond_amount
  );
END;
$$;