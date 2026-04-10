
-- Add equipped frame to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS equipped_frame text DEFAULT NULL;

-- Agency approval system
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending';
ALTER TABLE public.agencies ADD COLUMN IF NOT EXISTS commission_balance bigint NOT NULL DEFAULT 0;

-- Agency members enhancements
ALTER TABLE public.agency_members ADD COLUMN IF NOT EXISTS badge text NOT NULL DEFAULT 'host';
ALTER TABLE public.agency_members ADD COLUMN IF NOT EXISTS total_support bigint NOT NULL DEFAULT 0;
