
-- 1) Add 4-digit code + logo
ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS agency_code TEXT,
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Generator
CREATE OR REPLACE FUNCTION public.generate_agency_code()
RETURNS TEXT LANGUAGE plpgsql SET search_path = public AS $$
DECLARE c TEXT; exists_already BOOLEAN;
BEGIN
  LOOP
    c := lpad(floor(1000 + random()*9000)::int::text, 4, '0');
    SELECT EXISTS(SELECT 1 FROM public.agencies WHERE agency_code = c) INTO exists_already;
    IF NOT exists_already THEN RETURN c; END IF;
  END LOOP;
END $$;

-- Backfill existing rows
UPDATE public.agencies SET agency_code = public.generate_agency_code() WHERE agency_code IS NULL;

-- Enforce uniqueness + auto-assign on insert
ALTER TABLE public.agencies
  ALTER COLUMN agency_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS agencies_agency_code_key ON public.agencies(agency_code);

CREATE OR REPLACE FUNCTION public.set_agency_code()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.agency_code IS NULL OR NEW.agency_code = '' THEN
    NEW.agency_code := public.generate_agency_code();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_agency_code ON public.agencies;
CREATE TRIGGER trg_set_agency_code BEFORE INSERT ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.set_agency_code();

-- 2) Join requests table
CREATE TABLE IF NOT EXISTS public.agency_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  UNIQUE(agency_id, user_id, status)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_join_requests TO authenticated;
GRANT ALL ON public.agency_join_requests TO service_role;
ALTER TABLE public.agency_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own join requests"
  ON public.agency_join_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

CREATE POLICY "Users create own join requests"
  ON public.agency_join_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners respond to requests"
  ON public.agency_join_requests FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM agencies a WHERE a.id = agency_id AND a.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS agency_join_requests_agency_idx ON public.agency_join_requests(agency_id, status);
CREATE INDEX IF NOT EXISTS agency_join_requests_user_idx ON public.agency_join_requests(user_id, status);

-- 3) Search agency by 4-digit code
CREATE OR REPLACE FUNCTION public.search_agency_by_code(_code TEXT)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ag RECORD; member_count INT; owner_name TEXT; owner_avatar TEXT;
  cyc RECORD; cycle_total BIGINT := 0;
BEGIN
  SELECT * INTO ag FROM agencies WHERE agency_code = _code AND status = 'approved' AND is_active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('found', false); END IF;

  SELECT COUNT(*) INTO member_count FROM agency_members WHERE agency_id = ag.id AND badge = 'host';
  SELECT display_name, avatar_url INTO owner_name, owner_avatar FROM profiles WHERE id = ag.owner_id;

  SELECT * INTO cyc FROM get_target_cycle(CURRENT_DATE) LIMIT 1;
  SELECT COALESCE(SUM(gt.diamond_amount),0) INTO cycle_total
    FROM gift_transactions gt
    JOIN agency_members am ON am.user_id = gt.receiver_id
   WHERE am.agency_id = ag.id AND gt.created_at >= cyc.cycle_start AND gt.created_at < cyc.cycle_end + 1;

  RETURN jsonb_build_object(
    'found', true,
    'id', ag.id,
    'name', ag.name,
    'agency_code', ag.agency_code,
    'logo_url', ag.logo_url,
    'owner_id', ag.owner_id,
    'owner_name', owner_name,
    'owner_avatar', owner_avatar,
    'host_count', member_count,
    'cycle_label', cyc.cycle_label,
    'cycle_diamonds', cycle_total,
    'created_at', ag.created_at
  );
END $$;

-- 4) Apply to join
CREATE OR REPLACE FUNCTION public.apply_to_join_agency(_agency_id UUID, _message TEXT DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); req_id UUID; existing UUID; ag RECORD;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO ag FROM agencies WHERE id = _agency_id AND status='approved' AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Agency not found'; END IF;
  IF ag.owner_id = me THEN RAISE EXCEPTION 'أنت مالك هذه الوكالة'; END IF;
  IF EXISTS (SELECT 1 FROM agency_members WHERE user_id = me) THEN
    RAISE EXCEPTION 'أنت بالفعل عضو في وكالة';
  END IF;
  SELECT id INTO existing FROM agency_join_requests
    WHERE agency_id = _agency_id AND user_id = me AND status = 'pending';
  IF existing IS NOT NULL THEN RAISE EXCEPTION 'لديك طلب معلق بالفعل لهذه الوكالة'; END IF;

  INSERT INTO agency_join_requests (agency_id, user_id, message)
  VALUES (_agency_id, me, _message) RETURNING id INTO req_id;

  INSERT INTO notifications (user_id, title, message, type)
  VALUES (ag.owner_id, '🤝 طلب انضمام جديد',
          'لديك طلب جديد للانضمام إلى وكالة ' || ag.name, 'agency');

  RETURN req_id;
END $$;

-- 5) Respond to join request
CREATE OR REPLACE FUNCTION public.respond_join_request(_request_id UUID, _accept BOOLEAN)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); req RECORD; ag RECORD;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO req FROM agency_join_requests WHERE id = _request_id AND status='pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  SELECT * INTO ag FROM agencies WHERE id = req.agency_id;
  IF ag.owner_id <> me THEN RAISE EXCEPTION 'Unauthorized'; END IF;

  IF _accept THEN
    IF EXISTS (SELECT 1 FROM agency_members WHERE user_id = req.user_id) THEN
      UPDATE agency_join_requests SET status='rejected', reviewed_at = now() WHERE id = _request_id;
      RAISE EXCEPTION 'المستخدم بالفعل في وكالة أخرى';
    END IF;
    INSERT INTO agency_members (agency_id, user_id, role, badge)
    VALUES (req.agency_id, req.user_id, 'host', 'host');
    UPDATE profiles SET is_host = true, agency_id = req.agency_id WHERE id = req.user_id;
    UPDATE agency_join_requests SET status='accepted', reviewed_at = now() WHERE id = _request_id;
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (req.user_id, '🎉 تم قبولك في الوكالة',
            'مبروك! تم قبول طلبك للانضمام إلى وكالة ' || ag.name, 'agency');
  ELSE
    UPDATE agency_join_requests SET status='rejected', reviewed_at = now() WHERE id = _request_id;
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (req.user_id, '❌ تم رفض طلب الانضمام',
            'لم يتم قبول طلبك للانضمام إلى وكالة ' || ag.name, 'agency');
  END IF;
END $$;

-- 6) Auto-accumulate host gifts into agency_members.total_support (target tracking)
CREATE OR REPLACE FUNCTION public.accumulate_host_agency_support()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE agency_members
     SET total_support = total_support + COALESCE(NEW.diamond_amount,0)
   WHERE user_id = NEW.receiver_id;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_accumulate_host_agency_support ON public.gift_transactions;
CREATE TRIGGER trg_accumulate_host_agency_support
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.accumulate_host_agency_support();

-- 7) List my pending join requests (for the user)
CREATE OR REPLACE FUNCTION public.get_my_join_requests()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); result JSONB;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'request_id', r.id,
    'agency_id', r.agency_id,
    'agency_name', a.name,
    'agency_code', a.agency_code,
    'logo_url', a.logo_url,
    'status', r.status,
    'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO result
  FROM agency_join_requests r
  JOIN agencies a ON a.id = r.agency_id
  WHERE r.user_id = me;
  RETURN result;
END $$;

-- 8) List incoming join requests for the agency owner
CREATE OR REPLACE FUNCTION public.get_agency_join_requests()
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me UUID := auth.uid(); my_ag UUID; result JSONB;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT id INTO my_ag FROM agencies WHERE owner_id = me AND status='approved' AND is_active=true LIMIT 1;
  IF my_ag IS NULL THEN RETURN '[]'::jsonb; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'request_id', r.id,
    'user_id', r.user_id,
    'display_name', p.display_name,
    'friendly_id', p.user_id,
    'avatar_url', p.avatar_url,
    'message', r.message,
    'status', r.status,
    'created_at', r.created_at
  ) ORDER BY r.created_at DESC), '[]'::jsonb)
  INTO result
  FROM agency_join_requests r
  LEFT JOIN profiles p ON p.id = r.user_id
  WHERE r.agency_id = my_ag AND r.status = 'pending';
  RETURN result;
END $$;
