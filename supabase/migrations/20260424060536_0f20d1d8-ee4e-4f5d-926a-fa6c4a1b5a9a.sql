-- Add new columns to gifts table for enhanced gift system
ALTER TABLE public.gifts
  ADD COLUMN IF NOT EXISTS lottie_url TEXT,
  ADD COLUMN IF NOT EXISTS video_url TEXT,
  ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'normal',
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER NOT NULL DEFAULT 3500,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;

-- Add CHECK constraint via trigger (CHECK can't be used for safety here, use validation trigger if needed)
-- Tier values: normal | rare | epic | legendary | mythic

-- Index for fast lookup by active status and sort
CREATE INDEX IF NOT EXISTS idx_gifts_active_sort ON public.gifts (is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_gifts_tier ON public.gifts (tier);