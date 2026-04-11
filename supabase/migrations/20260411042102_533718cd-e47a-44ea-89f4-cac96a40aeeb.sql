
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entrance_video_url text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS entrance_audio_url text DEFAULT NULL;
