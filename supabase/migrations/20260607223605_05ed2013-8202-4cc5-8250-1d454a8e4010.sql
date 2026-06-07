
CREATE TABLE public.telegram_star_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  telegram_id bigint,
  package_index int NOT NULL,
  usdt int NOT NULL,
  stars int NOT NULL,
  coins int NOT NULL,
  diamonds int NOT NULL,
  payload text NOT NULL UNIQUE,
  telegram_charge_id text,
  provider_charge_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz
);
GRANT SELECT ON public.telegram_star_payments TO authenticated;
GRANT ALL ON public.telegram_star_payments TO service_role;
ALTER TABLE public.telegram_star_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_payments_read" ON public.telegram_star_payments
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

INSERT INTO public.system_settings(key, value)
VALUES ('stars_per_usd', '50')
ON CONFLICT (key) DO NOTHING;
