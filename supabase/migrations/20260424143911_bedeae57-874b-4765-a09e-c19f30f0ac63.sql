-- RPC: transfer diamonds from authenticated user to another user by their public 6-digit user_id
CREATE OR REPLACE FUNCTION public.transfer_diamonds_to_user(_recipient_user_id text, _amount bigint)
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
BEGIN
  IF sender IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be positive';
  END IF;

  -- Look up recipient by public friendly user_id (6 digits)
  SELECT id, display_name INTO recipient_id, recipient_name
    FROM public.profiles WHERE user_id = _recipient_user_id;

  IF recipient_id IS NULL THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  IF recipient_id = sender THEN
    RAISE EXCEPTION 'Cannot transfer to yourself';
  END IF;

  SELECT diamonds, display_name INTO sender_diamonds, sender_name
    FROM public.profiles WHERE id = sender;

  IF sender_diamonds IS NULL OR sender_diamonds < _amount THEN
    RAISE EXCEPTION 'Insufficient diamonds';
  END IF;

  -- Atomic transfer
  UPDATE public.profiles SET diamonds = diamonds - _amount WHERE id = sender;
  UPDATE public.profiles SET diamonds = diamonds + _amount WHERE id = recipient_id;

  -- Notifications
  INSERT INTO public.notifications (user_id, title, message, type) VALUES
    (recipient_id, '💎 تحويل ماس جديد', 'استلمت ' || _amount || ' ماسة من ' || COALESCE(sender_name, 'مستخدم'), 'transfer'),
    (sender, '✅ تم التحويل', 'تم إرسال ' || _amount || ' ماسة إلى ' || COALESCE(recipient_name, 'مستخدم'), 'transfer');

  RETURN jsonb_build_object(
    'recipient_id', recipient_id,
    'recipient_name', recipient_name,
    'amount', _amount,
    'new_balance', sender_diamonds - _amount
  );
END;
$$;