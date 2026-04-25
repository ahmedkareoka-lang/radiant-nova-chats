
-- 1. Recharge settings (single row)
CREATE TABLE IF NOT EXISTS public.recharge_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usdt_wallet_address text NOT NULL DEFAULT '',
  usdt_network text NOT NULL DEFAULT 'TRC20',
  usdt_qr_url text,
  notes text DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.recharge_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read recharge settings"
  ON public.recharge_settings FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Admin can manage recharge settings"
  ON public.recharge_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- Seed empty row if missing
INSERT INTO public.recharge_settings (usdt_wallet_address, usdt_network)
SELECT '', 'TRC20'
WHERE NOT EXISTS (SELECT 1 FROM public.recharge_settings);

-- 2. USDT Recharge requests
CREATE TABLE IF NOT EXISTS public.usdt_recharge_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount_usdt numeric NOT NULL,
  coins_amount bigint NOT NULL DEFAULT 0,
  diamonds_amount bigint NOT NULL DEFAULT 0,
  transaction_id text NOT NULL,
  network text NOT NULL DEFAULT 'TRC20',
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usdt_req_user ON public.usdt_recharge_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usdt_req_status ON public.usdt_recharge_requests(status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_usdt_req_txid ON public.usdt_recharge_requests(transaction_id);

ALTER TABLE public.usdt_recharge_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own usdt requests"
  ON public.usdt_recharge_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

CREATE POLICY "Users create own usdt requests"
  ON public.usdt_recharge_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admin manage usdt requests"
  ON public.usdt_recharge_requests FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- 3. Redeem codes
CREATE TABLE IF NOT EXISTS public.redeem_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  coins_amount bigint NOT NULL DEFAULT 0,
  diamonds_amount bigint NOT NULL DEFAULT 0,
  max_uses integer NOT NULL DEFAULT 1,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redeem_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin manage redeem codes"
  ON public.redeem_codes FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- 4. Redeem code usage log
CREATE TABLE IF NOT EXISTS public.redeem_code_uses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  coins_awarded bigint NOT NULL DEFAULT 0,
  diamonds_awarded bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

ALTER TABLE public.redeem_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own redeem uses"
  ON public.redeem_code_uses FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'super_admin'::app_role));

-- 5. RPC: redeem a code
CREATE OR REPLACE FUNCTION public.redeem_code(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_code public.redeem_codes%ROWTYPE;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  SELECT * INTO v_code FROM public.redeem_codes
   WHERE upper(code) = upper(trim(_code))
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_code');
  END IF;

  IF NOT v_code.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'inactive');
  END IF;

  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    RETURN jsonb_build_object('success', false, 'error', 'expired');
  END IF;

  IF v_code.uses_count >= v_code.max_uses THEN
    RETURN jsonb_build_object('success', false, 'error', 'exhausted');
  END IF;

  IF EXISTS (SELECT 1 FROM public.redeem_code_uses WHERE code_id = v_code.id AND user_id = v_user) THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_used');
  END IF;

  INSERT INTO public.redeem_code_uses (code_id, user_id, coins_awarded, diamonds_awarded)
  VALUES (v_code.id, v_user, v_code.coins_amount, v_code.diamonds_amount);

  UPDATE public.redeem_codes SET uses_count = uses_count + 1 WHERE id = v_code.id;

  UPDATE public.profiles
     SET coins = coins + v_code.coins_amount,
         diamonds = diamonds + v_code.diamonds_amount
   WHERE id = v_user;

  RETURN jsonb_build_object(
    'success', true,
    'coins', v_code.coins_amount,
    'diamonds', v_code.diamonds_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.redeem_code(text) TO authenticated;

-- 6. RPC: submit USDT recharge request
CREATE OR REPLACE FUNCTION public.submit_usdt_recharge(
  _amount_usdt numeric,
  _transaction_id text,
  _coins bigint DEFAULT 0,
  _diamonds bigint DEFAULT 0,
  _network text DEFAULT 'TRC20'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'unauthorized');
  END IF;

  IF _amount_usdt IS NULL OR _amount_usdt <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_amount');
  END IF;

  IF _transaction_id IS NULL OR length(trim(_transaction_id)) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_txid');
  END IF;

  IF EXISTS (SELECT 1 FROM public.usdt_recharge_requests WHERE transaction_id = trim(_transaction_id)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'duplicate_txid');
  END IF;

  INSERT INTO public.usdt_recharge_requests (
    user_id, amount_usdt, coins_amount, diamonds_amount, transaction_id, network, status
  ) VALUES (
    v_user, _amount_usdt, COALESCE(_coins, 0), COALESCE(_diamonds, 0), trim(_transaction_id), COALESCE(_network,'TRC20'), 'pending'
  ) RETURNING id INTO v_id;

  RETURN jsonb_build_object('success', true, 'request_id', v_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_usdt_recharge(numeric, text, bigint, bigint, text) TO authenticated;

-- 7. RPC: approve USDT recharge (admin)
CREATE OR REPLACE FUNCTION public.approve_usdt_recharge(_request_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin uuid := auth.uid();
  v_req public.usdt_recharge_requests%ROWTYPE;
BEGIN
  IF NOT (has_role(v_admin,'admin'::app_role) OR has_role(v_admin,'super_admin'::app_role)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  SELECT * INTO v_req FROM public.usdt_recharge_requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_found');
  END IF;

  IF v_req.status <> 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'already_reviewed');
  END IF;

  IF _approve THEN
    UPDATE public.profiles
       SET coins = coins + v_req.coins_amount,
           diamonds = diamonds + v_req.diamonds_amount
     WHERE id = v_req.user_id;

    UPDATE public.usdt_recharge_requests
       SET status='approved', reviewed_by=v_admin, reviewed_at=now(), admin_notes=_notes
     WHERE id = _request_id;
  ELSE
    UPDATE public.usdt_recharge_requests
       SET status='rejected', reviewed_by=v_admin, reviewed_at=now(), admin_notes=_notes
     WHERE id = _request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.approve_usdt_recharge(uuid, boolean, text) TO authenticated;
