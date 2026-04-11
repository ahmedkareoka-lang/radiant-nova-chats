-- Room bans table
CREATE TABLE public.room_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL,
  user_id uuid NOT NULL,
  banned_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read room bans" ON public.room_bans
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host or boss can ban" ON public.room_bans
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = banned_by AND (
      EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
      OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
    )
  );

CREATE POLICY "Host or boss can unban" ON public.room_bans
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
  );

-- Add locked_slots and muted_users columns to rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS locked_slots integer[] DEFAULT '{}';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS muted_users uuid[] DEFAULT '{}';

-- Allow host/boss to delete messages in their rooms
CREATE POLICY "Host or boss can delete room messages" ON public.messages
  FOR DELETE TO authenticated
  USING (
    auth.uid() = sender_id
    OR (room_id IS NOT NULL AND EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid()))
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_boss = true)
  );