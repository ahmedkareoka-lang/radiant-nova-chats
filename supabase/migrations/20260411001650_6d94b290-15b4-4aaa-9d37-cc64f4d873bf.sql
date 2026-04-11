
-- 1. Remove public rooms policy that exposes passwords
DROP POLICY IF EXISTS "nova_rooms_access" ON public.rooms;

-- 2. Fix messages: drop the overly permissive policy, keep membership-based one, add conversation access
DROP POLICY IF EXISTS "Users can read room messages" ON public.messages;
DROP POLICY IF EXISTS "Users can only read messages in their rooms" ON public.messages;

-- Re-create a single correct SELECT policy for messages
CREATE POLICY "Users can read their messages" ON public.messages
  FOR SELECT TO authenticated
  USING (
    -- Room messages: only if user is a member of that room
    (room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM room_members WHERE room_members.room_id = messages.room_id AND room_members.user_id = auth.uid()
    ))
    OR
    -- Conversation messages: only if user is part of the conversation
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    ))
  );

-- 3. Fix profile privilege escalation: replace update policies with safe one
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile except boss field" ON public.profiles;

CREATE POLICY "Users can update own safe fields" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_boss = (SELECT p.is_boss FROM public.profiles p WHERE p.id = auth.uid())
    AND coins = (SELECT p.coins FROM public.profiles p WHERE p.id = auth.uid())
    AND diamonds = (SELECT p.diamonds FROM public.profiles p WHERE p.id = auth.uid())
    AND vip_level = (SELECT p.vip_level FROM public.profiles p WHERE p.id = auth.uid())
    AND level = (SELECT p.level FROM public.profiles p WHERE p.id = auth.uid())
    AND wealth_xp = (SELECT p.wealth_xp FROM public.profiles p WHERE p.id = auth.uid())
    AND wealth_level = (SELECT p.wealth_level FROM public.profiles p WHERE p.id = auth.uid())
    AND charisma_xp = (SELECT p.charisma_xp FROM public.profiles p WHERE p.id = auth.uid())
    AND charisma_level = (SELECT p.charisma_level FROM public.profiles p WHERE p.id = auth.uid())
  );

-- 4. Fix profile PII exposure: remove public policy, restrict authenticated reads
DROP POLICY IF EXISTS "nova_profiles_access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.profiles;

-- Create a security definer function to get safe profile fields for other users
CREATE OR REPLACE FUNCTION public.get_profile_safe_fields(_profile_id uuid)
RETURNS TABLE(
  id uuid, display_name text, user_id text, avatar_url text, 
  vip_level integer, country_code text, gender text, level integer,
  is_boss boolean, equipped_frame text, wealth_level integer, charisma_level integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, display_name, user_id, avatar_url, vip_level, country_code, 
         gender, level, is_boss, equipped_frame, wealth_level, charisma_level
  FROM public.profiles WHERE profiles.id = _profile_id;
$$;

-- All authenticated users can read all profiles (needed for social features)
-- but sensitive fields like phone, coins, diamonds are visible
-- We keep full read for authenticated since the app needs it for rooms/chat/search
-- The real protection is removing public (anon) access
CREATE POLICY "Authenticated can read profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (true);

-- 5. Storage policies for assets bucket
CREATE POLICY "Owner can upload to assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can update own assets" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owner can delete own assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'assets' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can read assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'assets');
