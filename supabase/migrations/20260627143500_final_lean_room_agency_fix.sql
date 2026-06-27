-- Final surgical DB fix for live Room Level + Agency Target

CREATE OR REPLACE FUNCTION public.compute_room_level(_coins bigint)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE
    WHEN COALESCE(_coins, 0) >= 25000000 THEN 6
    WHEN COALESCE(_coins, 0) >= 13000000 THEN 5
    WHEN COALESCE(_coins, 0) >= 8000000 THEN 4
    WHEN COALESCE(_coins, 0) >= 3000000 THEN 3
    WHEN COALESCE(_coins, 0) >= 750000 THEN 2
    ELSE 1 END;
$$;

CREATE OR REPLACE FUNCTION public.compute_room_max_mics(_level integer)
RETURNS integer LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT CASE COALESCE(_level, 1) WHEN 6 THEN 20 WHEN 5 THEN 18 WHEN 4 THEN 16 WHEN 3 THEN 12 WHEN 2 THEN 8 ELSE 5 END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_room_level_and_mics()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_level integer; v_cap integer;
BEGIN
  v_level := public.compute_room_level(COALESCE(NEW.total_support_coins, 0));
  v_cap := public.compute_room_max_mics(v_level);
  NEW.room_level := v_level;
  IF TG_OP = 'INSERT' OR NEW.total_support_coins IS DISTINCT FROM OLD.total_support_coins THEN
    NEW.mic_count := v_cap;
  ELSE
    NEW.mic_count := LEAST(GREATEST(COALESCE(NEW.mic_count, v_cap), 5), v_cap);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_normalize_room_level_and_mics ON public.rooms;
CREATE TRIGGER trg_normalize_room_level_and_mics BEFORE INSERT OR UPDATE OF total_support_coins, room_level, mic_count ON public.rooms FOR EACH ROW EXECUTE FUNCTION public.normalize_room_level_and_mics();

DROP TRIGGER IF EXISTS trg_apply_gift_side_effects ON public.gift_transactions;
CREATE OR REPLACE FUNCTION public.apply_gift_side_effects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_room uuid; v_total bigint; v_level int; v_cap int; v_agency uuid; v_support bigint;
BEGIN
  v_room := NEW.room_id;
  IF v_room IS NULL THEN
    SELECT rm.room_id INTO v_room FROM public.room_members rm JOIN public.rooms r ON r.id = rm.room_id AND r.is_active = true WHERE rm.user_id = NEW.receiver_id ORDER BY rm.joined_at DESC NULLS LAST LIMIT 1;
    IF v_room IS NOT NULL THEN UPDATE public.gift_transactions SET room_id = v_room WHERE id = NEW.id; NEW.room_id := v_room; END IF;
  END IF;

  IF v_room IS NOT NULL AND COALESCE(NEW.gold_amount,0) > 0 THEN
    UPDATE public.rooms SET total_support_coins = COALESCE(total_support_coins,0) + NEW.gold_amount WHERE id = v_room RETURNING total_support_coins INTO v_total;
    IF v_total IS NOT NULL THEN
      v_level := public.compute_room_level(v_total); v_cap := public.compute_room_max_mics(v_level);
      UPDATE public.rooms SET room_level = v_level, mic_count = v_cap WHERE id = v_room;
    END IF;
  END IF;

  v_support := COALESCE(NEW.diamond_amount, NEW.gold_amount, 0);
  IF NEW.receiver_id IS NOT NULL AND v_support > 0 THEN
    SELECT agency_id INTO v_agency FROM public.profiles WHERE id = NEW.receiver_id;
    IF v_agency IS NULL THEN SELECT id INTO v_agency FROM public.agencies WHERE owner_id = NEW.receiver_id AND status='approved' AND is_active=true LIMIT 1; END IF;
    IF v_agency IS NOT NULL THEN
      INSERT INTO public.agency_members (agency_id,user_id,role,badge)
      SELECT a.id, NEW.receiver_id, CASE WHEN a.owner_id=NEW.receiver_id THEN 'owner' ELSE 'member' END, 'host' FROM public.agencies a WHERE a.id=v_agency
      ON CONFLICT (agency_id,user_id) DO UPDATE SET role = CASE WHEN EXCLUDED.role='owner' THEN 'owner' ELSE public.agency_members.role END, badge = CASE WHEN public.agency_members.role='owner' OR EXCLUDED.role='owner' THEN 'host' ELSE public.agency_members.badge END;
    END IF;
    UPDATE public.agency_members SET total_support = COALESCE(total_support,0) + v_support WHERE user_id = NEW.receiver_id AND (v_agency IS NULL OR agency_id = v_agency);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_apply_gift_side_effects AFTER INSERT ON public.gift_transactions FOR EACH ROW EXECUTE FUNCTION public.apply_gift_side_effects();

CREATE OR REPLACE FUNCTION public.validate_mic_access(_user_id uuid, _room_id uuid, _slot integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE room_mic_count int; level_cap int; effective_mics int; slot_locked boolean; slot_occupied boolean; user_banned boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.room_bans WHERE room_id=_room_id AND user_id=_user_id) INTO user_banned; IF user_banned THEN RETURN false; END IF;
  SELECT COALESCE(mic_count,5), public.compute_room_max_mics(COALESCE(room_level, public.compute_room_level(total_support_coins))) INTO room_mic_count, level_cap FROM public.rooms WHERE id=_room_id;
  IF room_mic_count IS NULL THEN RETURN false; END IF;
  effective_mics := LEAST(room_mic_count, level_cap); IF _slot < 0 OR _slot >= effective_mics THEN RETURN false; END IF;
  SELECT _slot = ANY(COALESCE(locked_slots, '{}')) INTO slot_locked FROM public.rooms WHERE id=_room_id;
  IF slot_locked AND NOT EXISTS(SELECT 1 FROM public.rooms WHERE id=_room_id AND host_id=_user_id) AND NOT public.has_role(_user_id,'admin') THEN RETURN false; END IF;
  SELECT EXISTS(SELECT 1 FROM public.room_members WHERE room_id=_room_id AND mic_slot=_slot AND user_id != _user_id) INTO slot_occupied; IF slot_occupied THEN RETURN false; END IF;
  IF EXISTS(SELECT 1 FROM public.rooms WHERE id=_room_id AND _user_id = ANY(COALESCE(muted_users, '{}'))) THEN RETURN false; END IF;
  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_agency_mic_hours(_user_id uuid, _hours numeric)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_minutes integer;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> _user_id THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _hours IS NULL OR _hours <= 0 OR _hours > 1 THEN RAISE EXCEPTION 'Invalid hours increment'; END IF;
  UPDATE public.agency_members SET mic_hours = COALESCE(mic_hours,0) + _hours WHERE user_id = _user_id;
  v_minutes := FLOOR(_hours * 60)::integer;
  IF v_minutes > 0 THEN
    INSERT INTO public.daily_tasks (user_id, task_date) VALUES (_user_id, CURRENT_DATE) ON CONFLICT (user_id, task_date) DO NOTHING;
    UPDATE public.daily_tasks SET room_minutes = COALESCE(room_minutes,0) + v_minutes WHERE user_id = _user_id AND task_date = CURRENT_DATE;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid,numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.increment_agency_mic_hours(uuid,numeric) TO authenticated;

INSERT INTO public.agency_members (agency_id,user_id,role,badge)
SELECT id, owner_id, 'owner', 'host' FROM public.agencies WHERE status='approved' AND is_active=true
ON CONFLICT (agency_id,user_id) DO UPDATE SET role='owner', badge='host';
UPDATE public.profiles p SET is_agent=true, is_host=true, agency_id=a.id FROM public.agencies a WHERE a.owner_id=p.id AND a.status='approved' AND a.is_active=true;

CREATE OR REPLACE FUNCTION public.get_host_agency_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid:=auth.uid(); m_agency uuid; m_support bigint; m_hours numeric; td bigint:=0; tm int:=0; cd bigint:=0; cm int:=0; cyc record;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT agency_id,total_support,mic_hours INTO m_agency,m_support,m_hours FROM public.agency_members WHERE user_id=me LIMIT 1;
  IF m_agency IS NULL THEN SELECT id INTO m_agency FROM public.agencies WHERE owner_id=me AND status='approved' AND is_active=true LIMIT 1; END IF;
  IF m_agency IS NULL THEN RETURN jsonb_build_object('has_agency',false); END IF;
  SELECT * INTO cyc FROM public.get_target_cycle(CURRENT_DATE) LIMIT 1;
  SELECT COALESCE(SUM(diamond_amount),0) INTO td FROM public.gift_transactions WHERE receiver_id=me AND created_at>=CURRENT_DATE AND created_at<CURRENT_DATE+1;
  SELECT COALESCE(SUM(diamond_amount),0) INTO cd FROM public.gift_transactions WHERE receiver_id=me AND created_at>=cyc.cycle_start AND created_at<cyc.cycle_end+1;
  SELECT COALESCE(room_minutes,0) INTO tm FROM public.daily_tasks WHERE user_id=me AND task_date=CURRENT_DATE;
  SELECT COALESCE(SUM(room_minutes),0) INTO cm FROM public.daily_tasks WHERE user_id=me AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end;
  RETURN jsonb_build_object('has_agency',true,'agency_id',m_agency,'today_diamonds',td,'today_minutes',COALESCE(tm,0),'cycle_label',cyc.cycle_label,'cycle_start',cyc.cycle_start,'cycle_end',cyc.cycle_end,'cycle_diamonds',cd,'cycle_minutes',COALESCE(cm,0),'lifetime_support',COALESCE(m_support,0),'lifetime_mic_hours',COALESCE(m_hours,0));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_agency_overview()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE me uuid:=auth.uid(); ag record; cyc record; hosts_data jsonb;
BEGIN
  IF me IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO ag FROM public.agencies WHERE owner_id=me AND status='approved' AND is_active=true LIMIT 1; IF ag.id IS NULL THEN RETURN jsonb_build_object('has_agency',false); END IF;
  SELECT * INTO cyc FROM public.get_target_cycle(CURRENT_DATE) LIMIT 1;
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY (t.cycle_diamonds)::bigint DESC),'[]'::jsonb) INTO hosts_data FROM (
    SELECT m.user_id host_id,p.display_name,p.user_id friendly_id,p.avatar_url,m.role,m.badge,(m.user_id=ag.owner_id) is_owner,m.joined_at,m.mic_hours lifetime_hours,m.total_support lifetime_support,
      COALESCE((SELECT SUM(diamond_amount) FROM public.gift_transactions WHERE receiver_id=m.user_id AND created_at>=cyc.cycle_start AND created_at<cyc.cycle_end+1),0) cycle_diamonds,
      COALESCE((SELECT SUM(room_minutes) FROM public.daily_tasks WHERE user_id=m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end),0) cycle_minutes,
      COALESCE((SELECT COUNT(*) FROM public.daily_tasks WHERE user_id=m.user_id AND task_date BETWEEN cyc.cycle_start AND cyc.cycle_end AND room_minutes>=60),0) cycle_active_days
    FROM public.agency_members m LEFT JOIN public.profiles p ON p.id=m.user_id WHERE m.agency_id=ag.id AND (m.badge='host' OR m.role='owner' OR m.user_id=ag.owner_id)
  ) t;
  RETURN jsonb_build_object('has_agency',true,'agency_id',ag.id,'agency_name',ag.name,'created_at',ag.created_at,'cycle_label',cyc.cycle_label,'cycle_start',cyc.cycle_start,'cycle_end',cyc.cycle_end,'host_count',(SELECT COUNT(*) FROM public.agency_members m WHERE m.agency_id=ag.id AND (m.badge='host' OR m.role='owner' OR m.user_id=ag.owner_id)),'hosts',hosts_data);
END;
$$;

UPDATE public.rooms r SET total_support_coins = COALESCE(s.total_gold,0) FROM (SELECT room_id,SUM(gold_amount)::bigint total_gold FROM public.gift_transactions WHERE room_id IS NOT NULL GROUP BY room_id) s WHERE r.id=s.room_id;
UPDATE public.rooms r SET total_support_coins=0 WHERE NOT EXISTS (SELECT 1 FROM public.gift_transactions gt WHERE gt.room_id=r.id);
UPDATE public.rooms SET room_level=public.compute_room_level(total_support_coins), mic_count=public.compute_room_max_mics(public.compute_room_level(total_support_coins));
UPDATE public.agency_members am SET total_support=COALESCE(s.total_diamonds,0) FROM (SELECT receiver_id,SUM(diamond_amount)::bigint total_diamonds FROM public.gift_transactions GROUP BY receiver_id) s WHERE am.user_id=s.receiver_id;
UPDATE public.agency_members am SET total_support=0 WHERE NOT EXISTS (SELECT 1 FROM public.gift_transactions gt WHERE gt.receiver_id=am.user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='rooms') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='gift_transactions') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.gift_transactions; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='agency_members') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_members; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='daily_tasks') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_tasks; END IF;
END $$;
