-- Grant admin role to all current BOSS users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM public.profiles WHERE is_boss = true
ON CONFLICT DO NOTHING;

-- Trigger: when a profile is set as BOSS, automatically add admin role
CREATE OR REPLACE FUNCTION public.sync_boss_admin_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_boss = true AND (OLD.is_boss IS DISTINCT FROM true) THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  ELSIF NEW.is_boss = false AND OLD.is_boss = true THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.id AND role = 'admin'::app_role;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_boss_admin_role_trigger ON public.profiles;
CREATE TRIGGER sync_boss_admin_role_trigger
AFTER UPDATE OF is_boss ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_boss_admin_role();

-- Also handle INSERT case (new BOSS profile)
CREATE OR REPLACE FUNCTION public.sync_boss_admin_role_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_boss = true THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_boss_admin_role_insert_trigger ON public.profiles;
CREATE TRIGGER sync_boss_admin_role_insert_trigger
AFTER INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_boss_admin_role_insert();