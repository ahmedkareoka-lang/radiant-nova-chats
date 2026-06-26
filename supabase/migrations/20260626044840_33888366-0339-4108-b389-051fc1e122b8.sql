
-- 1) Room cumulative support + computed level
ALTER TABLE public.rooms
  ADD COLUMN IF NOT EXISTS total_support_coins bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS room_level int NOT NULL DEFAULT 1;

-- 2) Tag every gift with the room it occurred in
ALTER TABLE public.gift_transactions
  ADD COLUMN IF NOT EXISTS room_id uuid;

CREATE INDEX IF NOT EXISTS idx_gift_tx_room ON public.gift_transactions(room_id);

-- 3) Pure helpers (lifetime cumulative thresholds)
CREATE OR REPLACE FUNCTION public.compute_room_level(_coins bigint)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN _coins >= 25000000 THEN 6
    WHEN _coins >= 13000000 THEN 5
    WHEN _coins >=  8000000 THEN 4
    WHEN _coins >=  3000000 THEN 3
    WHEN _coins >=   750000 THEN 2
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION public.compute_room_max_mics(_level int)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _level
    WHEN 6 THEN 20
    WHEN 5 THEN 18
    WHEN 4 THEN 16
    WHEN 3 THEN 12
    WHEN 2 THEN 8
    ELSE 5
  END;
$$;

-- 4) Backfill existing rooms based on their gift history
UPDATE public.rooms r
SET total_support_coins = COALESCE(t.sum_gold, 0),
    room_level = public.compute_room_level(COALESCE(t.sum_gold, 0))
FROM (
  SELECT room_id, SUM(gold_amount)::bigint AS sum_gold
  FROM public.gift_transactions
  WHERE room_id IS NOT NULL
  GROUP BY room_id
) t
WHERE r.id = t.room_id;

UPDATE public.rooms
SET room_level = public.compute_room_level(total_support_coins);

-- 5) Per-gift trigger: update room totals, level, mic_count, and agency target
CREATE OR REPLACE FUNCTION public.apply_gift_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_total bigint;
  new_level int;
  cap int;
  cur_mics int;
  ag_id uuid;
BEGIN
  -- a) Room support roll-up
  IF NEW.room_id IS NOT NULL AND NEW.gold_amount > 0 THEN
    UPDATE public.rooms
       SET total_support_coins = total_support_coins + NEW.gold_amount
     WHERE id = NEW.room_id
     RETURNING total_support_coins, mic_count INTO new_total, cur_mics;

    IF new_total IS NOT NULL THEN
      new_level := public.compute_room_level(new_total);
      cap := public.compute_room_max_mics(new_level);
      UPDATE public.rooms
         SET room_level = new_level,
             mic_count = GREATEST(COALESCE(cur_mics, 5), cap)
       WHERE id = NEW.room_id;
    END IF;
  END IF;

  -- b) Agency target roll-up for receiver (host/agent/member)
  IF NEW.receiver_id IS NOT NULL AND NEW.gold_amount > 0 THEN
    SELECT agency_id INTO ag_id FROM public.profiles WHERE id = NEW.receiver_id;
    IF ag_id IS NOT NULL THEN
      UPDATE public.agency_members
         SET total_support = COALESCE(total_support, 0) + NEW.gold_amount
       WHERE agency_id = ag_id AND user_id = NEW.receiver_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_gift_side_effects ON public.gift_transactions;
CREATE TRIGGER trg_apply_gift_side_effects
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_gift_side_effects();

-- 6) Backfill mic_count caps to match current level (never shrink)
UPDATE public.rooms
SET mic_count = GREATEST(COALESCE(mic_count, 5), public.compute_room_max_mics(room_level));

-- 7) Aggregated QA view: per-agency, per-member target + hours
CREATE OR REPLACE VIEW public.agency_target_qa AS
SELECT
  a.id            AS agency_id,
  a.name          AS agency_name,
  a.owner_id      AS agency_owner_id,
  m.user_id       AS member_id,
  m.role          AS member_role,
  p.display_name  AS member_name,
  p.is_agent      AS is_agent,
  p.is_host       AS is_host,
  COALESCE(m.total_support, 0)  AS support_target_coins,
  COALESCE(m.mic_hours, 0)      AS hours_target,
  m.joined_at
FROM public.agencies a
JOIN public.agency_members m ON m.agency_id = a.id
LEFT JOIN public.profiles p ON p.id = m.user_id;

GRANT SELECT ON public.agency_target_qa TO authenticated;
