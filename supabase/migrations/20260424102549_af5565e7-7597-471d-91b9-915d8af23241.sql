-- Log table for agent transfers
CREATE TABLE IF NOT EXISTS public.agent_transfer_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  amount bigint NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_transfer_log_agent ON public.agent_transfer_log(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_transfer_log_recipient ON public.agent_transfer_log(recipient_id);

ALTER TABLE public.agent_transfer_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the full log
CREATE POLICY "Admin can read transfer log"
ON public.agent_transfer_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

-- Agents can read their own transfer history
CREATE POLICY "Agent can read own transfer log"
ON public.agent_transfer_log
FOR SELECT
TO authenticated
USING (auth.uid() = agent_id);

-- Update the transfer function to also log
CREATE OR REPLACE FUNCTION public.agent_transfer_coins(_recipient_id uuid, _amount bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  SELECT EXISTS (
    SELECT 1 FROM public.recharge_agents
    WHERE user_id = sender AND is_active = true
  ) INTO is_active_agent;

  IF NOT is_active_agent THEN
    RAISE EXCEPTION 'Only active recharge agents can transfer coins';
  END IF;

  SELECT display_name INTO recipient_name FROM public.profiles WHERE id = _recipient_id;
  IF recipient_name IS NULL THEN
    RAISE EXCEPTION 'Recipient not found';
  END IF;

  SELECT coins INTO sender_coins FROM public.profiles WHERE id = sender;
  IF sender_coins IS NULL OR sender_coins < _amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;

  UPDATE public.profiles SET coins = coins - _amount WHERE id = sender;
  UPDATE public.profiles SET coins = coins + _amount WHERE id = _recipient_id;

  -- Log the transfer
  INSERT INTO public.agent_transfer_log (agent_id, recipient_id, amount)
  VALUES (sender, _recipient_id, _amount);

  PERFORM public.process_referral_recharge(_recipient_id, _amount);

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
$function$;