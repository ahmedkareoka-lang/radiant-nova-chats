
-- Dual role: agency owners are also hosts
CREATE OR REPLACE FUNCTION public.sync_agency_owner_roles()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- If owner has no other active agencies, clear is_agent (keep is_host as-is)
    IF NOT EXISTS (
      SELECT 1 FROM public.agencies
      WHERE owner_id = OLD.owner_id AND is_active = true AND id <> OLD.id
    ) THEN
      UPDATE public.profiles SET is_agent = false WHERE id = OLD.owner_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.is_active = true AND NEW.owner_id IS NOT NULL THEN
    UPDATE public.profiles
      SET is_agent = true, is_host = true
      WHERE id = NEW.owner_id;
  ELSIF TG_OP = 'UPDATE' AND NEW.is_active = false AND OLD.is_active = true THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.agencies
      WHERE owner_id = NEW.owner_id AND is_active = true AND id <> NEW.id
    ) THEN
      UPDATE public.profiles SET is_agent = false WHERE id = NEW.owner_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_agency_owner_roles ON public.agencies;
CREATE TRIGGER trg_sync_agency_owner_roles
AFTER INSERT OR UPDATE OF is_active, owner_id OR DELETE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.sync_agency_owner_roles();

-- Backfill: every current active agency owner becomes host + agent
UPDATE public.profiles p
SET is_agent = true, is_host = true
FROM public.agencies a
WHERE a.owner_id = p.id AND a.is_active = true;
