
-- 1. Add verification badge to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

-- 2. Add description column to banners (for fullscreen modal)
ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS description text;

-- 3. BOSS-only RPC to grant/revoke verification
CREATE OR REPLACE FUNCTION public.boss_set_verified(_user_id uuid, _value boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_boss boolean;
BEGIN
  SELECT is_boss INTO _is_boss FROM public.profiles WHERE id = auth.uid();
  IF NOT COALESCE(_is_boss, false) THEN
    RAISE EXCEPTION 'Only BOSS can modify verification badge';
  END IF;
  UPDATE public.profiles SET is_verified = _value WHERE id = _user_id;
  -- Notify user
  INSERT INTO public.notifications(user_id, type, title, message)
  VALUES (
    _user_id,
    'system',
    CASE WHEN _value THEN '🎖️ تم توثيق حسابك' ELSE 'تم إلغاء توثيق حسابك' END,
    CASE WHEN _value THEN 'مبروك! تم منحك شارة التوثيق الرسمية من NOVA OFFICIAL' ELSE 'تم سحب شارة التوثيق من حسابك' END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.boss_set_verified(uuid, boolean) TO authenticated;
