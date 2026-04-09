
-- Add new columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS wealth_level integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS wealth_xp bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS charisma_level integer NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS charisma_xp bigint NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS country_code text DEFAULT NULL;

-- Pricing plans per country
CREATE TABLE public.pricing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  country_name text NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  coin_price numeric NOT NULL DEFAULT 1.00,
  diamond_price numeric NOT NULL DEFAULT 2.00,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read pricing" ON public.pricing_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "Boss can manage pricing" ON public.pricing_plans FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
);

-- System settings (conversion ratios etc)
CREATE TABLE public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Boss can manage settings" ON public.system_settings FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
);
INSERT INTO public.system_settings (key, value) VALUES ('gift_conversion_rate', '50');
INSERT INTO public.system_settings (key, value) VALUES ('exchange_rate', '100');

-- Agencies
CREATE TABLE public.agencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  broadcast_enabled boolean NOT NULL DEFAULT true,
  recharge_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read agencies" ON public.agencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owner can manage agency" ON public.agencies FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Auth can create agency" ON public.agencies FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Boss can manage all agencies" ON public.agencies FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
);

-- Agency members
CREATE TABLE public.agency_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);
ALTER TABLE public.agency_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read members" ON public.agency_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can join" ON public.agency_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave" ON public.agency_members FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Inventory
CREATE TABLE public.inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_name text NOT NULL,
  item_data jsonb DEFAULT '{}',
  acquired_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own inventory" ON public.inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can insert inventory" ON public.inventory FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own notifications" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- Gift transactions log
CREATE TABLE public.gift_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  gift_name text NOT NULL,
  gold_amount bigint NOT NULL,
  diamond_amount bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own gifts" ON public.gift_transactions FOR SELECT TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Auth can send gifts" ON public.gift_transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

-- Store items
CREATE TABLE public.store_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  price_coins bigint NOT NULL DEFAULT 0,
  price_diamonds bigint NOT NULL DEFAULT 0,
  image_url text,
  data jsonb DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read store items" ON public.store_items FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Boss can manage store" ON public.store_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true)
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions;

-- Insert default pricing for Arab countries
INSERT INTO public.pricing_plans (country_code, country_name, currency, coin_price, diamond_price) VALUES
('SA', 'السعودية', 'SAR', 3.75, 7.50),
('AE', 'الإمارات', 'AED', 3.67, 7.34),
('EG', 'مصر', 'EGP', 48.00, 96.00),
('IQ', 'العراق', 'IQD', 1310.00, 2620.00),
('JO', 'الأردن', 'JOD', 0.71, 1.42),
('KW', 'الكويت', 'KWD', 0.31, 0.62),
('BH', 'البحرين', 'BHD', 0.38, 0.76),
('QA', 'قطر', 'QAR', 3.64, 7.28),
('OM', 'عُمان', 'OMR', 0.38, 0.76),
('LB', 'لبنان', 'LBP', 89500.00, 179000.00),
('SY', 'سوريا', 'SYP', 13000.00, 26000.00),
('LY', 'ليبيا', 'LYD', 4.85, 9.70),
('TN', 'تونس', 'TND', 3.10, 6.20),
('DZ', 'الجزائر', 'DZD', 134.00, 268.00),
('MA', 'المغرب', 'MAD', 10.00, 20.00),
('SD', 'السودان', 'SDG', 600.00, 1200.00),
('YE', 'اليمن', 'YER', 250.00, 500.00),
('PS', 'فلسطين', 'ILS', 3.60, 7.20),
('US', 'عالمي (USD)', 'USD', 1.00, 2.00);
