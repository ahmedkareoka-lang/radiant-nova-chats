-- Add category column to gifts table so BOSS/Admin can categorize gifts
-- which then appear in their proper tab in the room gift picker.
ALTER TABLE public.gifts
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'general';

-- Optional helpful index for filtering by category
CREATE INDEX IF NOT EXISTS idx_gifts_category ON public.gifts(category);

COMMENT ON COLUMN public.gifts.category IS
'Tab category in the gift picker: general | latest | gallery | lucky | lover | locked';