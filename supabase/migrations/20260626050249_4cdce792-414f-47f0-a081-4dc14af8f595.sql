
-- 1) Backfill agency_members row for every approved agency owner
INSERT INTO public.agency_members (agency_id, user_id, role, badge)
SELECT a.id, a.owner_id, 'owner', 'agent'
FROM public.agencies a
WHERE a.status = 'approved' AND a.owner_id IS NOT NULL
ON CONFLICT (agency_id, user_id) DO NOTHING;

-- 2) Ensure owner profiles point to their agency
UPDATE public.profiles p
SET agency_id = a.id
FROM public.agencies a
WHERE a.owner_id = p.id
  AND a.status = 'approved'
  AND (p.agency_id IS NULL OR p.agency_id <> a.id);

-- 3) Trigger: auto-add owner to agency_members on insert/approval
CREATE OR REPLACE FUNCTION public.ensure_owner_in_agency_members()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.owner_id IS NOT NULL AND NEW.status = 'approved' THEN
    INSERT INTO public.agency_members (agency_id, user_id, role, badge)
    VALUES (NEW.id, NEW.owner_id, 'owner', 'agent')
    ON CONFLICT (agency_id, user_id) DO NOTHING;

    UPDATE public.profiles
       SET agency_id = NEW.id
     WHERE id = NEW.owner_id
       AND (agency_id IS NULL OR agency_id <> NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_owner_in_agency_members ON public.agencies;
CREATE TRIGGER trg_ensure_owner_in_agency_members
AFTER INSERT OR UPDATE OF status, owner_id ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.ensure_owner_in_agency_members();

-- 4) Backfill historical support totals for owners that were missing memberships
UPDATE public.agency_members m
SET total_support = COALESCE(t.s, 0)
FROM (
  SELECT gt.receiver_id, SUM(gt.gold_amount)::bigint AS s
  FROM public.gift_transactions gt
  GROUP BY gt.receiver_id
) t
WHERE m.user_id = t.receiver_id
  AND m.role = 'owner'
  AND COALESCE(m.total_support, 0) = 0;
