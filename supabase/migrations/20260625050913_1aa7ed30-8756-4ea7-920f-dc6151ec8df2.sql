
-- 1) Allow self-gifting
CREATE OR REPLACE FUNCTION public.send_gift_atomic(_receiver_id uuid, _gold_amount bigint, _gift_name text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE sender uuid := auth.uid(); rate int; diamond_amount bigint; cur_coins bigint;
BEGIN
  IF sender IS NULL THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  IF _gold_amount IS NULL OR _gold_amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  SELECT coins INTO cur_coins FROM profiles WHERE id = sender FOR UPDATE;
  IF cur_coins IS NULL OR cur_coins < _gold_amount THEN RAISE EXCEPTION 'Insufficient coins'; END IF;
  SELECT COALESCE(NULLIF(value,'')::int, 50) INTO rate FROM system_settings WHERE key = 'gift_conversion_rate';
  rate := COALESCE(rate, 50);
  diamond_amount := floor((_gold_amount * rate) / 100.0)::bigint;
  PERFORM public.deduct_coins_add_wealth(sender, _gold_amount, _gold_amount);
  PERFORM public.add_diamonds_add_charisma(_receiver_id, diamond_amount, diamond_amount);
  RETURN jsonb_build_object('diamond_amount', diamond_amount, 'gold_amount', _gold_amount);
END;
$function$;

-- 2) Room code architecture
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_code text;
CREATE UNIQUE INDEX IF NOT EXISTS rooms_room_code_key ON public.rooms(room_code) WHERE room_code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.generate_room_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE candidate text; tries int := 0;
BEGIN
  LOOP
    candidate := lpad((10000000 + floor(random() * 90000000)::bigint)::text, 8, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.rooms WHERE room_code = candidate)
          AND NOT EXISTS (SELECT 1 FROM public.agencies WHERE agency_code = candidate);
    tries := tries + 1;
    EXIT WHEN tries > 30;
  END LOOP;
  RETURN candidate;
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_room_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ag_code text;
BEGIN
  SELECT agency_code INTO ag_code
    FROM public.agencies
   WHERE owner_id = NEW.host_id AND is_active = true
   LIMIT 1;

  IF ag_code IS NOT NULL AND NEW.is_active = true THEN
    NEW.room_code := ag_code;
  ELSIF NEW.room_code IS NULL OR NEW.room_code = '' THEN
    NEW.room_code := public.generate_room_code();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_room_code ON public.rooms;
CREATE TRIGGER trg_assign_room_code
BEFORE INSERT OR UPDATE OF host_id, is_active ON public.rooms
FOR EACH ROW EXECUTE FUNCTION public.assign_room_code();

CREATE OR REPLACE FUNCTION public.sync_rooms_from_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE r record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    FOR r IN SELECT id FROM public.rooms WHERE host_id = OLD.owner_id AND room_code = OLD.agency_code LOOP
      UPDATE public.rooms SET room_code = public.generate_room_code() WHERE id = r.id;
    END LOOP;
    RETURN OLD;
  END IF;

  IF NEW.is_active = true THEN
    -- only the host's active room takes the agency code
    UPDATE public.rooms SET room_code = NEW.agency_code
     WHERE host_id = NEW.owner_id AND is_active = true;
  ELSE
    FOR r IN SELECT id FROM public.rooms WHERE host_id = NEW.owner_id AND room_code = NEW.agency_code LOOP
      UPDATE public.rooms SET room_code = public.generate_room_code() WHERE id = r.id;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_rooms_from_agency ON public.agencies;
CREATE TRIGGER trg_sync_rooms_from_agency
AFTER INSERT OR UPDATE OF agency_code, is_active, owner_id OR DELETE ON public.agencies
FOR EACH ROW EXECUTE FUNCTION public.sync_rooms_from_agency();

-- Backfill: random 8-digit for everyone first
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.rooms WHERE room_code IS NULL LOOP
    UPDATE public.rooms SET room_code = public.generate_room_code() WHERE id = r.id;
  END LOOP;
END$$;

-- Then overwrite the host's ACTIVE room with the agency code
UPDATE public.rooms r
   SET room_code = a.agency_code
  FROM public.agencies a
 WHERE a.owner_id = r.host_id
   AND a.is_active = true
   AND r.is_active = true
   AND r.room_code IS DISTINCT FROM a.agency_code;
