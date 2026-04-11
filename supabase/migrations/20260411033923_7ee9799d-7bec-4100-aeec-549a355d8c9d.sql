
-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS age integer,
  ADD COLUMN IF NOT EXISTS is_agent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_host boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id) ON DELETE SET NULL;

-- Update profiles RLS policy to allow updating new safe fields (age)
DROP POLICY IF EXISTS "Users can update own safe fields" ON public.profiles;
CREATE POLICY "Users can update own safe fields" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  (auth.uid() = id)
  AND (is_boss = (SELECT p.is_boss FROM profiles p WHERE p.id = auth.uid()))
  AND (coins = (SELECT p.coins FROM profiles p WHERE p.id = auth.uid()))
  AND (diamonds = (SELECT p.diamonds FROM profiles p WHERE p.id = auth.uid()))
  AND (vip_level = (SELECT p.vip_level FROM profiles p WHERE p.id = auth.uid()))
  AND (level = (SELECT p.level FROM profiles p WHERE p.id = auth.uid()))
  AND (wealth_xp = (SELECT p.wealth_xp FROM profiles p WHERE p.id = auth.uid()))
  AND (wealth_level = (SELECT p.wealth_level FROM profiles p WHERE p.id = auth.uid()))
  AND (charisma_xp = (SELECT p.charisma_xp FROM profiles p WHERE p.id = auth.uid()))
  AND (charisma_level = (SELECT p.charisma_level FROM profiles p WHERE p.id = auth.uid()))
  AND (is_agent = (SELECT p.is_agent FROM profiles p WHERE p.id = auth.uid()))
  AND (is_host = (SELECT p.is_host FROM profiles p WHERE p.id = auth.uid()))
  AND (agency_id IS NOT DISTINCT FROM (SELECT p.agency_id FROM profiles p WHERE p.id = auth.uid()))
);

-- Create agency_invites table
CREATE TABLE public.agency_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can create invites" ON public.agency_invites
FOR INSERT TO authenticated WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can read own invites" ON public.agency_invites
FOR SELECT TO authenticated USING (auth.uid() = target_user_id OR auth.uid() = agent_id);

CREATE POLICY "Target can update invite" ON public.agency_invites
FOR UPDATE TO authenticated USING (auth.uid() = target_user_id);

-- Create agency_resignations table
CREATE TABLE public.agency_resignations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  host_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agency_resignations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can create resignations" ON public.agency_resignations
FOR INSERT TO authenticated WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Agents and hosts can read resignations" ON public.agency_resignations
FOR SELECT TO authenticated USING (
  auth.uid() = host_id OR 
  EXISTS (SELECT 1 FROM agencies WHERE agencies.id = agency_id AND agencies.owner_id = auth.uid())
);

CREATE POLICY "Agents can update resignations" ON public.agency_resignations
FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM agencies WHERE agencies.id = agency_id AND agencies.owner_id = auth.uid())
);

-- Function to accept agency invite (SECURITY DEFINER to update protected fields)
CREATE OR REPLACE FUNCTION public.accept_agency_invite(_invite_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv RECORD;
BEGIN
  IF auth.uid() != _user_id THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  SELECT * INTO inv FROM agency_invites WHERE id = _invite_id AND target_user_id = _user_id AND status = 'pending';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invite not found';
  END IF;
  
  UPDATE agency_invites SET status = 'accepted' WHERE id = _invite_id;
  UPDATE profiles SET is_host = true, agency_id = inv.agency_id WHERE id = _user_id;
  
  -- Add to agency_members
  INSERT INTO agency_members (agency_id, user_id, role, badge)
  VALUES (inv.agency_id, _user_id, 'host', 'host')
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to remove host (agent only)
CREATE OR REPLACE FUNCTION public.remove_agency_host(_agent_id uuid, _host_id uuid, _agency_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify agent owns this agency
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE id = _agency_id AND owner_id = _agent_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE profiles SET is_host = false, agency_id = NULL WHERE id = _host_id;
  DELETE FROM agency_members WHERE user_id = _host_id AND agency_id = _agency_id;
END;
$$;

-- Function to approve resignation
CREATE OR REPLACE FUNCTION public.approve_resignation(_agent_id uuid, _resignation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  res RECORD;
BEGIN
  SELECT * INTO res FROM agency_resignations WHERE id = _resignation_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found'; END IF;
  
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE id = res.agency_id AND owner_id = _agent_id) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  UPDATE agency_resignations SET status = 'approved' WHERE id = _resignation_id;
  UPDATE profiles SET is_host = false, agency_id = NULL WHERE id = res.host_id;
  DELETE FROM agency_members WHERE user_id = res.host_id AND agency_id = res.agency_id;
END;
$$;
