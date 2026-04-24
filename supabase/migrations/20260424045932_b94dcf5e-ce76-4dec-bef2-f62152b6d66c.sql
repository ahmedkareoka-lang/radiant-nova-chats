-- Couple Seats system
CREATE TABLE public.room_couples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  slot1 INTEGER NOT NULL,
  slot2 INTEGER NOT NULL,
  love_score BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(room_id)
);

CREATE INDEX idx_room_couples_room ON public.room_couples(room_id) WHERE is_active = true;

ALTER TABLE public.room_couples ENABLE ROW LEVEL SECURITY;

-- Anyone can read active couples
CREATE POLICY "Anyone can read active couples"
ON public.room_couples FOR SELECT
TO authenticated
USING (true);

-- Only host can create/update/delete couples in their room
CREATE POLICY "Host can manage couples"
ON public.room_couples FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
);

CREATE POLICY "Host can update couples"
ON public.room_couples FOR UPDATE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
);

CREATE POLICY "Host can delete couples"
ON public.room_couples FOR DELETE
TO authenticated
USING (
  EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND host_id = auth.uid())
);

-- Function to start couple
CREATE OR REPLACE FUNCTION public.start_couple_seat(
  _room_id UUID,
  _user1_id UUID,
  _user2_id UUID,
  _slot1 INTEGER,
  _slot2 INTEGER
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_host BOOLEAN;
  new_id UUID;
BEGIN
  SELECT EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid()) INTO is_host;
  IF NOT is_host THEN
    RAISE EXCEPTION 'Only host can start couple seat';
  END IF;

  IF _user1_id = _user2_id THEN
    RAISE EXCEPTION 'Cannot couple a user with themselves';
  END IF;

  -- Deactivate any existing couple in this room
  DELETE FROM room_couples WHERE room_id = _room_id;

  INSERT INTO room_couples (room_id, user1_id, user2_id, slot1, slot2, is_active)
  VALUES (_room_id, _user1_id, _user2_id, _slot1, _slot2, true)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Function to end couple
CREATE OR REPLACE FUNCTION public.end_couple_seat(_room_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only host can end couple seat';
  END IF;

  DELETE FROM room_couples WHERE room_id = _room_id;
END;
$$;

-- Trigger: increment love_score when gifts sent between couple members
CREATE OR REPLACE FUNCTION public.update_couple_love_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Find any active couple where both sender and receiver are members
  UPDATE room_couples
  SET love_score = love_score + NEW.gold_amount
  WHERE is_active = true
    AND (
      (user1_id = NEW.sender_id AND user2_id = NEW.receiver_id)
      OR (user2_id = NEW.sender_id AND user1_id = NEW.receiver_id)
    );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_couple_love_score
AFTER INSERT ON public.gift_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_couple_love_score();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_couples;