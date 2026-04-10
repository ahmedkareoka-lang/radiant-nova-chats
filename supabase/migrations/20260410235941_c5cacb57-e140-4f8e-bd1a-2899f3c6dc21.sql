-- Add FK from rooms.host_id -> profiles.id
ALTER TABLE public.rooms
  ADD CONSTRAINT rooms_host_id_profiles_fkey
  FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add FK from room_members.user_id -> profiles.id
ALTER TABLE public.room_members
  ADD CONSTRAINT room_members_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Add FK from messages.sender_id -> profiles.id
ALTER TABLE public.messages
  ADD CONSTRAINT messages_sender_id_profiles_fkey
  FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;