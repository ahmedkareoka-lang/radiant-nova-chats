
-- 1. Public read for gifts table
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gifts" ON public.gifts
FOR SELECT USING (true);

CREATE POLICY "Admin can manage gifts" ON public.gifts
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'super_admin'::app_role));

-- 2. Add room_image to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_image text DEFAULT NULL;

-- 3. Update wealth leveling function with tiered XP
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
  
  -- Calculate level from tiered XP
  remaining_xp := new_xp;
  lvl := 0;
  LOOP
    IF lvl < 10 THEN threshold := 25000;
    ELSIF lvl < 20 THEN threshold := 40000;
    ELSIF lvl < 30 THEN threshold := 65000;
    ELSIF lvl < 40 THEN threshold := 100000;
    ELSIF lvl < 50 THEN threshold := 150000;
    ELSE threshold := 300000;
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

-- 4. Update charisma leveling function with tiered XP
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
  
  -- Calculate level from tiered XP
  remaining_xp := new_xp;
  lvl := 0;
  LOOP
    IF lvl < 10 THEN threshold := 15000;
    ELSIF lvl < 20 THEN threshold := 25000;
    ELSIF lvl < 30 THEN threshold := 40000;
    ELSIF lvl < 40 THEN threshold := 70000;
    ELSIF lvl < 50 THEN threshold := 110000;
    ELSE threshold := 200000;
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
