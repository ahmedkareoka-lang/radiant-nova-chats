-- Allow active recharge agents to transfer coins to any user from their own balance
CREATE OR REPLACE FUNCTION public.agent_transfer_coins(
  _recipient_id uuid,
  _amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender uuid := auth.uid();
  is_active_agent boolean;
  sender_coins bigint;
  recipient_name text;
  sender_name text;
BEGIN
  IF sender IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  IF sender = _recipient_id THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  -- Verify the sender is an active recharge agent
  SELECT EXISTS (
    SELECT 1 FROM public.recharge_agents
    WHERE user_id = sender AND is_active = true
  ) INTO is_active_agent;

  IF NOT is_active_agent THEN
    RAISE EXCEPTION 'Only active recharge agents can transfer coins';
  END IF;

  -- Check the recipient exists
  SELECT display_name INTO recipient_name FROM public.profiles WHERE id = _recipient_id;
  IF recipient_name IS NULL THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  -- Check balance
  SELECT coins INTO sender_coins FROM public.profiles WHERE id = sender;
  IF sender_coins IS NULL OR sender_coins < _amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  -- Atomic transfer
  UPDATE public.profiles SET coins = coins - _amount WHERE id = sender;
  UPDATE public.profiles SET coins = coins + _amount WHERE id = _recipient_id;

  -- Track for referral recharge bonuses (treat as a recharge for the recipient)
  PERFORM public.process_referral_recharge(_recipient_id, _amount);

  -- Notifications
  SELECT display_name INTO sender_name FROM public.profiles WHERE id = sender;

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    _recipient_id,
    '💰 شحن جديد!',
    'استلمت ' || _amount || ' كوينز من وكيل الشحن ' || COALESCE(sender_name, 'مستخدم'),
    'recharge'
  );

  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    sender,
    '✅ تم التحويل',
    'تم إرسال ' || _amount || ' كوينز إلى ' || COALESCE(recipient_name, 'مستخدم'),
    'recharge'
  );
END;
$$;