
-- Helper: upsert + increment today's quest progress for a couple
CREATE OR REPLACE FUNCTION public._bump_love_quest(
  _couple_id uuid,
  _quest_key text,
  _delta int
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _target int;
  _reward int;
BEGIN
  IF _couple_id IS NULL OR _delta <= 0 THEN RETURN; END IF;

  -- Default quest config (must match useLoveQuests.ts DEFAULT_QUESTS)
  IF _quest_key = 'send_3_gifts'      THEN _target := 3;  _reward := 1500;
  ELSIF _quest_key = 'spend_30_min_room' THEN _target := 30; _reward := 2000;
  ELSIF _quest_key = 'exchange_50_msgs'  THEN _target := 50; _reward := 1000;
  ELSE RETURN;
  END IF;

  INSERT INTO public.love_quests (couple_id, quest_date, quest_key, target, reward_points, progress, completed)
  VALUES (_couple_id, CURRENT_DATE, _quest_key, _target, _reward, LEAST(_delta, _target), _delta >= _target)
  ON CONFLICT (couple_id, quest_date, quest_key)
  DO UPDATE SET
    progress = LEAST(public.love_quests.progress + _delta, public.love_quests.target),
    completed = (public.love_quests.progress + _delta) >= public.love_quests.target,
    updated_at = now()
  WHERE public.love_quests.claimed = false;
END;
$$;

-- Find active couple for two users (either direction)
CREATE OR REPLACE FUNCTION public._find_active_couple(_a uuid, _b uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.love_couples
  WHERE is_active = true
    AND ((user1_id = _a AND user2_id = _b) OR (user1_id = _b AND user2_id = _a))
  LIMIT 1;
$$;

-- Trigger: gifts between partners → bump send_3_gifts
CREATE OR REPLACE FUNCTION public.trg_love_quest_gift()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
BEGIN
  cid := public._find_active_couple(NEW.sender_id, NEW.receiver_id);
  IF cid IS NOT NULL THEN
    PERFORM public._bump_love_quest(cid, 'send_3_gifts', 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_love_quest_gift ON public.gift_transactions;
CREATE TRIGGER trg_love_quest_gift
AFTER INSERT ON public.gift_transactions
FOR EACH ROW EXECUTE FUNCTION public.trg_love_quest_gift();

-- Trigger: DM messages between partners → bump exchange_50_msgs
CREATE OR REPLACE FUNCTION public.trg_love_quest_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cid uuid;
  other_id uuid;
  u1 uuid; u2 uuid;
BEGIN
  IF NEW.conversation_id IS NULL THEN RETURN NEW; END IF;
  SELECT user1_id, user2_id INTO u1, u2
  FROM public.conversations WHERE id = NEW.conversation_id;
  IF u1 IS NULL THEN RETURN NEW; END IF;
  other_id := CASE WHEN NEW.sender_id = u1 THEN u2 ELSE u1 END;
  cid := public._find_active_couple(NEW.sender_id, other_id);
  IF cid IS NOT NULL THEN
    PERFORM public._bump_love_quest(cid, 'exchange_50_msgs', 1);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_love_quest_message ON public.messages;
CREATE TRIGGER trg_love_quest_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.trg_love_quest_message();

-- RPC: client (VoiceRoom) reports shared minutes when both partners are in same room
CREATE OR REPLACE FUNCTION public.bump_couple_room_minutes(_room_id uuid, _minutes int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cid uuid;
  partner uuid;
  both_present boolean;
  bump int;
BEGIN
  IF uid IS NULL OR _room_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauth');
  END IF;

  SELECT id, CASE WHEN user1_id = uid THEN user2_id ELSE user1_id END
    INTO cid, partner
  FROM public.love_couples
  WHERE is_active = true AND (user1_id = uid OR user2_id = uid)
  LIMIT 1;

  IF cid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_couple');
  END IF;

  SELECT
    EXISTS(SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = uid)
    AND EXISTS(SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = partner)
  INTO both_present;

  IF NOT both_present THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'partner_absent');
  END IF;

  bump := GREATEST(1, LEAST(_minutes, 5));
  PERFORM public._bump_love_quest(cid, 'spend_30_min_room', bump);
  RETURN jsonb_build_object('ok', true, 'minutes', bump);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bump_couple_room_minutes(uuid, int) TO authenticated;
