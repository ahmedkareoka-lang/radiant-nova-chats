
-- Fix overly permissive notification insert policy
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Users or boss can create notifications" ON public.notifications FOR INSERT TO authenticated 
WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_boss = true));

-- Fix pre-existing overly permissive room_members policy
DROP POLICY IF EXISTS "nova_members_access" ON public.room_members;
