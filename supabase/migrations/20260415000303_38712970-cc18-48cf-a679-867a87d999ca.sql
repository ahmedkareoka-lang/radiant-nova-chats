
-- Update wealth leveling with exponential scaling at higher levels
CREATE OR REPLACE FUNCTION public.deduct_coins_add_wealth(_user_id uuid, _coin_amount bigint, _xp_amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_coins bigint;
  new_xp bigint;
  new_level integer;
  remaining_xp bigint;
  lvl integer;
  threshold bigint;
BEGIN
  SELECT coins INTO current_coins FROM profiles WHERE id = _user_id;
  IF current_coins < _coin_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  SELECT wealth_xp + _xp_amount INTO new_xp FROM profiles WHERE id = _user_id;
  
  remaining_xp := new_xp;
  lvl := 0;
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
    remaining_xp := remaining_xp - threshold;
    lvl := lvl + 1;
  END LOOP;
  
  new_level := GREATEST(1, lvl);
  
  UPDATE profiles 
  SET coins = coins - _coin_amount,
      wealth_xp = new_xp,
      wealth_level = new_level
  WHERE id = _user_id;
END;
$$;

-- Update charisma leveling with exponential scaling at higher levels
CREATE OR REPLACE FUNCTION public.add_diamonds_add_charisma(_user_id uuid, _diamond_amount bigint, _xp_amount bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_xp bigint;
  new_level integer;
  remaining_xp bigint;
  lvl integer;
  threshold bigint;
BEGIN
  SELECT charisma_xp + _xp_amount INTO new_xp FROM profiles WHERE id = _user_id;
  
  remaining_xp := new_xp;
  lvl := 0;
  LOOP
    IF lvl < 10 THEN threshold := 15000;
    ELSIF lvl < 20 THEN threshold := 25000;
    ELSIF lvl < 30 THEN threshold := 40000;
    ELSIF lvl < 40 THEN threshold := 70000;
    ELSIF lvl < 50 THEN threshold := 110000;
    ELSIF lvl < 60 THEN threshold := 200000;
    ELSIF lvl < 70 THEN threshold := 350000;
    ELSIF lvl < 80 THEN threshold := 550000;
    ELSIF lvl < 90 THEN threshold := 800000;
    ELSE threshold := 1200000;
    END IF;
    
    IF remaining_xp < threshold OR lvl >= 100 THEN EXIT; END IF;
    remaining_xp := remaining_xp - threshold;
    lvl := lvl + 1;
  END LOOP;
  
  new_level := GREATEST(1, lvl);
  
  UPDATE profiles 
  SET diamonds = diamonds + _diamond_amount,
      charisma_xp = new_xp,
      charisma_level = new_level
  WHERE id = _user_id;
END;
$$;

-- Add banners table for home screen banners
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT '',
  image_url text NOT NULL,
  link_url text DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners" ON public.banners
FOR SELECT USING (true);

CREATE POLICY "Admin can manage banners" ON public.banners
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- Public read for store_items (ensure it exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'store_items' AND policyname = 'Anyone can read store items') THEN
    CREATE POLICY "Anyone can read store items" ON public.store_items FOR SELECT USING (true);
  END IF;
END $$;
