
ALTER TABLE public.store_items
  ADD COLUMN IF NOT EXISTS tier_type TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS tier_required INTEGER NOT NULL DEFAULT 0;

-- Wipe existing store items so admin starts fresh with new tier-organized content
DELETE FROM public.store_items;
