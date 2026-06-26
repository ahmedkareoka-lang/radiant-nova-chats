
-- Credit room lifetime support, recompute level and mic seats
CREATE OR REPLACE FUNCTION public.credit_room_support()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total bigint;
  v_new_level int;
  v_new_max int;
  v_current_mics int;
BEGIN
  IF NEW.room_id IS NULL OR NEW.gold_amount IS NULL OR NEW.gold_amount <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.rooms
     SET total_support_coins = COALESCE(total_support_coins, 0) + NEW.gold_amount
   WHERE id = NEW.room_id
   RETURNING total_support_coins, mic_count
        INTO v_new_total, v_current_mics;

  IF v_new_total IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_level := public.compute_room_level(v_new_total);
  v_new_max   := public.compute_room_max_mics(v_new_level);

  UPDATE public.rooms
     SET room_level = v_new_level,
         mic_count  = GREATEST(COALESCE(v_current_mics, 5), v_new_max)
   WHERE id = NEW.room_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_room_support ON public.gift_transactions;
CREATE TRIGGER trg_credit_room_support
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.credit_room_support();

-- Credit agency monthly support target for the receiver
CREATE OR REPLACE FUNCTION public.credit_agency_target_on_gift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.receiver_id IS NULL OR NEW.gold_amount IS NULL OR NEW.gold_amount <= 0 THEN
    RETURN NEW;
  END IF;

  UPDATE public.agency_members
     SET total_support = COALESCE(total_support, 0) + NEW.gold_amount
   WHERE user_id = NEW.receiver_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_agency_target ON public.gift_transactions;
CREATE TRIGGER trg_credit_agency_target
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.credit_agency_target_on_gift();

-- Backfill room totals & levels from historical gifts so existing rooms reflect their real support.
WITH totals AS (
  SELECT room_id, SUM(gold_amount)::bigint AS s
    FROM public.gift_transactions
   WHERE room_id IS NOT NULL
   GROUP BY room_id
)
UPDATE public.rooms r
   SET total_support_coins = t.s,
       room_level = public.compute_room_level(t.s),
       mic_count  = GREATEST(COALESCE(r.mic_count, 5), public.compute_room_max_mics(public.compute_room_level(t.s)))
  FROM totals t
 WHERE r.id = t.room_id;

-- Backfill agency member totals
WITH totals AS (
  SELECT receiver_id AS user_id, SUM(gold_amount)::bigint AS s
    FROM public.gift_transactions
   GROUP BY receiver_id
)
UPDATE public.agency_members am
   SET total_support = t.s
  FROM totals t
 WHERE am.user_id = t.user_id;
