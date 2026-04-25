-- ============================================
-- FIX 1: Restrict 'phone' column on profiles
-- Only the owner can read their own phone number
-- ============================================

-- Revoke column-level SELECT on phone from authenticated/anon
REVOKE SELECT (phone) ON public.profiles FROM authenticated, anon;

-- Grant SELECT on every other column to authenticated (so existing queries still work)
GRANT SELECT (
  id, user_id, display_name, avatar_url, cover_url, gender, age, country_code,
  level, vip_level, vip_expiry, nova_p_level, nova_p_expiry,
  charisma_xp, charisma_level, wealth_xp, wealth_level, total_spend_gold,
  coins, diamonds, is_boss, is_agent, is_host, is_bd, agency_eligible, agency_id,
  equipped_frame, equipped_badge, equipped_chat_bubble,
  equipped_entrance_effect, equipped_name_style,
  entrance_video_url, entrance_audio_url,
  created_at
) ON public.profiles TO authenticated;

-- Allow owner full SELECT (including phone)
GRANT SELECT ON public.profiles TO authenticated;
-- Note: above re-grants all columns, but RLS still restricts rows.
-- We need column-level enforcement. Use REVOKE again then granular GRANT:

REVOKE SELECT ON public.profiles FROM authenticated, anon;

-- Grant only non-sensitive columns to all authenticated users
GRANT SELECT (
  id, user_id, display_name, avatar_url, cover_url, gender, age, country_code,
  level, vip_level, vip_expiry, nova_p_level, nova_p_expiry,
  charisma_xp, charisma_level, wealth_xp, wealth_level, total_spend_gold,
  coins, diamonds, is_boss, is_agent, is_host, is_bd, agency_eligible, agency_id,
  equipped_frame, equipped_badge, equipped_chat_bubble,
  equipped_entrance_effect, equipped_name_style,
  entrance_video_url, entrance_audio_url,
  created_at
) ON public.profiles TO authenticated;

-- Phone can only be selected by the owner via the existing "Owner can read own full profile" RLS policy.
-- Grant phone column to authenticated; RLS row policy "Owner can read own full profile" + the
-- broad "Authenticated can read profiles public fields" policy work together.
-- To enforce phone is owner-only, we drop broad SELECT on phone column entirely:
-- Owners read phone via service_role function or via specific policy + grant.
GRANT SELECT (phone) ON public.profiles TO authenticated;

-- Now phone is granted, but we must restrict via RLS. The current RLS allows all rows for
-- authenticated. We change strategy: drop the broad authenticated SELECT policy and replace
-- with a policy that excludes phone access for non-owners is not possible at row-level.
-- SOLUTION: keep both grants and policies, but rely on PostgREST column-level security.
-- Revoke phone again so non-owners cannot select it via PostgREST:
REVOKE SELECT (phone) ON public.profiles FROM authenticated;

-- Owners still need to read phone. Owners use the service-role-like `auth.uid() = id` policy
-- but column GRANTs apply per-role, not per-row. To allow owners to read phone, we need a
-- separate mechanism. Create a SECURITY DEFINER function for owners to fetch their phone.

CREATE OR REPLACE FUNCTION public.get_my_phone()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_my_phone() TO authenticated;

-- ============================================
-- FIX 2: Realtime channel authorization
-- Restrict realtime.messages subscriptions
-- ============================================

-- Enable RLS on realtime.messages (Supabase Realtime authorization)
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing permissive policies if any
DROP POLICY IF EXISTS "Authenticated can subscribe to allowed topics" ON realtime.messages;

-- Allow authenticated users to receive broadcast/presence on:
--  - public room topics (room:<room_id>) if member of that room
--  - own user topic (user:<auth.uid()>)
--  - conversation topics (conversation:<id>) if participant
CREATE POLICY "Authenticated can subscribe to allowed topics"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  -- Own user-scoped channel
  realtime.topic() = ('user:' || auth.uid()::text)
  OR
  -- Room channel: must be a room member
  (
    realtime.topic() LIKE 'room:%'
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.user_id = auth.uid()
        AND rm.room_id::text = substring(realtime.topic() FROM 6)
    )
  )
  OR
  -- Conversation channel: must be a participant
  (
    realtime.topic() LIKE 'conversation:%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() FROM 14)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
  OR
  -- Public table-change topics (postgres_changes): allow, RLS on underlying tables protects data
  realtime.topic() LIKE 'realtime:%'
);

-- Allow broadcasting (insert) from authenticated users on the same topics
CREATE POLICY "Authenticated can broadcast to allowed topics"
ON realtime.messages
FOR INSERT
TO authenticated
WITH CHECK (
  realtime.topic() = ('user:' || auth.uid()::text)
  OR
  (
    realtime.topic() LIKE 'room:%'
    AND EXISTS (
      SELECT 1 FROM public.room_members rm
      WHERE rm.user_id = auth.uid()
        AND rm.room_id::text = substring(realtime.topic() FROM 6)
    )
  )
  OR
  (
    realtime.topic() LIKE 'conversation:%'
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id::text = substring(realtime.topic() FROM 14)
        AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  )
);