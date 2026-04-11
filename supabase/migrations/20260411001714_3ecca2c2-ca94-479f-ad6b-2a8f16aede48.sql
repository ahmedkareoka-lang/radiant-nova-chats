
-- Function to safely update coins and wealth for gift sending
CREATE OR REPLACE FUNCTION public.deduct_coins_add_wealth(
  _user_id uuid,
  _coin_amount bigint,
  _xp_amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_coins bigint;
  new_xp bigint;
  new_level integer;
BEGIN
  SELECT coins INTO current_coins FROM profiles WHERE id = _user_id;
  IF current_coins < _coin_amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  SELECT wealth_xp + _xp_amount INTO new_xp FROM profiles WHERE id = _user_id;
  new_level := GREATEST(1, (new_xp / 1000)::integer + 1);
  
  UPDATE profiles 
  SET coins = coins - _coin_amount,
      wealth_xp = new_xp,
      wealth_level = new_level
  WHERE id = _user_id;
END;
$$;

-- Function to add diamonds and charisma for gift receiving
CREATE OR REPLACE FUNCTION public.add_diamonds_add_charisma(
  _user_id uuid,
  _diamond_amount bigint,
  _xp_amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_xp bigint;
  new_level integer;
BEGIN
  SELECT charisma_xp + _xp_amount INTO new_xp FROM profiles WHERE id = _user_id;
  new_level := GREATEST(1, (new_xp / 1000)::integer + 1);
  
  UPDATE profiles 
  SET diamonds = diamonds + _diamond_amount,
      charisma_xp = new_xp,
      charisma_level = new_level
  WHERE id = _user_id;
END;
$$;

-- Function for store purchases (deduct coins)
CREATE OR REPLACE FUNCTION public.deduct_coins(
  _user_id uuid,
  _amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_coins bigint;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT coins INTO current_coins FROM profiles WHERE id = _user_id;
  IF current_coins < _amount THEN
    RAISE EXCEPTION 'Insufficient coins';
  END IF;
  
  UPDATE profiles SET coins = coins - _amount WHERE id = _user_id;
END;
$$;

-- Function for wallet exchange (diamonds to gold)
CREATE OR REPLACE FUNCTION public.exchange_diamonds_to_coins(
  _user_id uuid,
  _diamond_amount bigint,
  _coin_amount bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_diamonds bigint;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT diamonds INTO current_diamonds FROM profiles WHERE id = _user_id;
  IF current_diamonds < _diamond_amount THEN
    RAISE EXCEPTION 'Insufficient diamonds';
  END IF;
  
  UPDATE profiles 
  SET diamonds = diamonds - _diamond_amount,
      coins = coins + _coin_amount
  WHERE id = _user_id;
END;
$$;

-- Function for admin actions (boss distributes coins, bans, promotes)
CREATE OR REPLACE FUNCTION public.admin_update_profile(
  _admin_id uuid,
  _target_id uuid,
  _coins bigint DEFAULT NULL,
  _diamonds bigint DEFAULT NULL,
  _vip_level integer DEFAULT NULL,
  _is_boss boolean DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify admin is boss
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = _admin_id AND is_boss = true) THEN
    RAISE EXCEPTION 'Unauthorized: not admin';
  END IF;
  
  UPDATE profiles SET
    coins = COALESCE(_coins, coins),
    diamonds = COALESCE(_diamonds, diamonds),
    vip_level = COALESCE(_vip_level, vip_level),
    is_boss = COALESCE(_is_boss, is_boss)
  WHERE id = _target_id;
END;
$$;
