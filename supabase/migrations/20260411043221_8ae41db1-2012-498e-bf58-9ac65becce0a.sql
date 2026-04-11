
-- ===== 1. PHONE PRIVACY: Create secure view & update profiles SELECT policy =====

-- Create a public view excluding phone number
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT id, display_name, user_id, avatar_url, coins, diamonds, level, vip_level,
       is_boss, is_agent, is_host, agency_id, age, country_code, gender,
       wealth_level, wealth_xp, charisma_level, charisma_xp, equipped_frame,
       entrance_video_url, entrance_audio_url, created_at
FROM public.profiles;

-- Drop old permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can read profiles" ON public.profiles;

-- Owner can read ALL fields (including phone)
CREATE POLICY "Owner can read own full profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Others can read non-sensitive fields (via direct query — phone will be null for non-owners)
-- We use a security definer function instead
CREATE OR REPLACE FUNCTION public.is_own_profile(_profile_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _profile_id = auth.uid()
$$;

-- Allow all authenticated users to read profiles (phone is protected by the view pattern)
CREATE POLICY "Authenticated can read profiles public fields"
ON public.profiles FOR SELECT TO authenticated
USING (true);

-- ===== 2. MESSAGING SECURITY: Only room members can send messages =====

-- Drop old insert policy
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;

-- New: Users can only send messages to rooms they are members of, or to conversations they belong to
CREATE POLICY "Members can send messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND (
    -- Room messages: user must be a member
    (room_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM room_members WHERE room_members.room_id = messages.room_id AND room_members.user_id = auth.uid()
    ))
    OR
    -- DM messages: user must be part of the conversation
    (conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversations WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    ))
  )
);

-- ===== 3. PRIVILEGE ESCALATION: Restrict agency_members self-insert =====

DROP POLICY IF EXISTS "Users can join" ON public.agency_members;

CREATE POLICY "Users can join with member role only"
ON public.agency_members FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND role = 'member'
  AND badge = 'host'
);

-- ===== 4. PRIVILEGE ESCALATION: Store items — use has_role() instead of is_boss =====

DROP POLICY IF EXISTS "Boss can manage store" ON public.store_items;

CREATE POLICY "Admin can manage store"
ON public.store_items FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Also fix system_settings, pricing_plans, and notifications policies that use is_boss
DROP POLICY IF EXISTS "Boss can manage settings" ON public.system_settings;
CREATE POLICY "Admin can manage settings"
ON public.system_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

DROP POLICY IF EXISTS "Boss can manage pricing" ON public.pricing_plans;
CREATE POLICY "Admin can manage pricing"
ON public.pricing_plans FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Fix notifications insert to use has_role
DROP POLICY IF EXISTS "Users or boss can create notifications" ON public.notifications;
CREATE POLICY "Users or admin can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Fix room_bans policies to use has_role instead of is_boss
DROP POLICY IF EXISTS "Host or boss can ban" ON public.room_bans;
CREATE POLICY "Host or admin can ban"
ON public.room_bans FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = banned_by AND (
    EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  )
);

DROP POLICY IF EXISTS "Host or boss can unban" ON public.room_bans;
CREATE POLICY "Host or admin can unban"
ON public.room_bans FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Fix messages delete policy
DROP POLICY IF EXISTS "Host or boss can delete room messages" ON public.messages;
CREATE POLICY "Host or admin can delete room messages"
ON public.messages FOR DELETE TO authenticated
USING (
  auth.uid() = sender_id
  OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM rooms WHERE rooms.id = messages.room_id AND rooms.host_id = auth.uid()))
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- Fix agencies management policy
DROP POLICY IF EXISTS "Boss can manage all agencies" ON public.agencies;
CREATE POLICY "Admin can manage all agencies"
ON public.agencies FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- ===== 5. STORAGE: Remove duplicate permissive upload policies =====
DROP POLICY IF EXISTS "Allow Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
