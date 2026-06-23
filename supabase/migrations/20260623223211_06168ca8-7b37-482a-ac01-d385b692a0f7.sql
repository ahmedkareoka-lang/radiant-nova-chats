
-- TURF WARS: real cross-room battles between two voice rooms
CREATE TABLE IF NOT EXISTS public.turf_wars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_a UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  room_b UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  host_a UUID NOT NULL,
  host_b UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  winner_room UUID,
  started_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT turf_wars_status_chk CHECK (status IN ('pending','active','finished','declined','cancelled','expired')),
  CONSTRAINT turf_wars_diff_rooms CHECK (room_a <> room_b)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.turf_wars TO authenticated;
GRANT ALL ON public.turf_wars TO service_role;

ALTER TABLE public.turf_wars ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read wars (needed for matchmaking discoverability)
CREATE POLICY "turf_wars_select_all_auth" ON public.turf_wars
  FOR SELECT TO authenticated USING (true);

-- Direct writes are blocked; everything happens via SECURITY DEFINER functions below.

CREATE INDEX IF NOT EXISTS idx_turf_wars_room_a ON public.turf_wars(room_a) WHERE status IN ('pending','active');
CREATE INDEX IF NOT EXISTS idx_turf_wars_room_b ON public.turf_wars(room_b) WHERE status IN ('pending','active');

-- updated_at trigger (reuse if exists)
CREATE OR REPLACE FUNCTION public.tw_touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_turf_wars_updated_at ON public.turf_wars;
CREATE TRIGGER trg_turf_wars_updated_at
  BEFORE UPDATE ON public.turf_wars
  FOR EACH ROW EXECUTE FUNCTION public.tw_touch_updated_at();

-- Add to realtime publication
ALTER TABLE public.turf_wars REPLICA IDENTITY FULL;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'turf_wars'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.turf_wars';
  END IF;
END $$;

-- =================
-- RPC: start_turf_war
-- Caller must be host of _room_id. Picks a random eligible opponent room.
-- Eligible = is_active, host not null, not equal to caller's room, not already in pending/active war.
-- Returns the created war row or raises if no opponent found.
-- =================
CREATE OR REPLACE FUNCTION public.start_turf_war(_room_id UUID)
RETURNS public.turf_wars
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_host UUID;
  v_opp_room UUID;
  v_opp_host UUID;
  v_war public.turf_wars;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT host_id INTO v_host FROM public.rooms WHERE id = _room_id;
  IF v_host IS NULL OR v_host <> v_user THEN
    RAISE EXCEPTION 'not_room_host';
  END IF;

  -- Caller's room must not already be in a war
  IF EXISTS (
    SELECT 1 FROM public.turf_wars
    WHERE status IN ('pending','active')
      AND (room_a = _room_id OR room_b = _room_id)
  ) THEN
    RAISE EXCEPTION 'already_in_war';
  END IF;

  -- Find an eligible opponent room: active, has host, not the caller's, not busy in war
  SELECT r.id, r.host_id INTO v_opp_room, v_opp_host
  FROM public.rooms r
  WHERE r.is_active = true
    AND r.host_id IS NOT NULL
    AND r.id <> _room_id
    AND NOT EXISTS (
      SELECT 1 FROM public.turf_wars w
      WHERE w.status IN ('pending','active')
        AND (w.room_a = r.id OR w.room_b = r.id)
    )
  ORDER BY random()
  LIMIT 1;

  IF v_opp_room IS NULL THEN
    RAISE EXCEPTION 'no_opponent_available';
  END IF;

  INSERT INTO public.turf_wars (room_a, room_b, host_a, host_b, status)
  VALUES (_room_id, v_opp_room, v_user, v_opp_host, 'pending')
  RETURNING * INTO v_war;

  RETURN v_war;
END;
$$;

GRANT EXECUTE ON FUNCTION public.start_turf_war(UUID) TO authenticated;

-- =================
-- RPC: respond_turf_war (host_b accepts or declines a pending challenge)
-- =================
CREATE OR REPLACE FUNCTION public.respond_turf_war(_war_id UUID, _accept BOOLEAN, _duration_seconds INTEGER DEFAULT 300)
RETURNS public.turf_wars
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_war public.turf_wars;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v_war FROM public.turf_wars WHERE id = _war_id FOR UPDATE;
  IF v_war.id IS NULL THEN RAISE EXCEPTION 'war_not_found'; END IF;
  IF v_war.host_b <> v_user THEN RAISE EXCEPTION 'not_opponent_host'; END IF;
  IF v_war.status <> 'pending' THEN RAISE EXCEPTION 'war_not_pending'; END IF;

  IF _accept THEN
    UPDATE public.turf_wars
      SET status = 'active',
          started_at = now(),
          ends_at = now() + make_interval(secs => GREATEST(60, LEAST(_duration_seconds, 1800)))
      WHERE id = _war_id
      RETURNING * INTO v_war;
  ELSE
    UPDATE public.turf_wars SET status = 'declined' WHERE id = _war_id RETURNING * INTO v_war;
  END IF;
  RETURN v_war;
END;
$$;

GRANT EXECUTE ON FUNCTION public.respond_turf_war(UUID, BOOLEAN, INTEGER) TO authenticated;

-- =================
-- RPC: add_turf_war_points — any authenticated user who is a member of that room may add points.
-- =================
CREATE OR REPLACE FUNCTION public.add_turf_war_points(_war_id UUID, _room_id UUID, _amount INTEGER)
RETURNS public.turf_wars
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_war public.turf_wars;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 OR _amount > 100000 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT * INTO v_war FROM public.turf_wars WHERE id = _war_id FOR UPDATE;
  IF v_war.id IS NULL THEN RAISE EXCEPTION 'war_not_found'; END IF;
  IF v_war.status <> 'active' THEN RAISE EXCEPTION 'war_not_active'; END IF;
  IF v_war.ends_at IS NOT NULL AND v_war.ends_at < now() THEN
    RAISE EXCEPTION 'war_already_ended';
  END IF;
  IF _room_id <> v_war.room_a AND _room_id <> v_war.room_b THEN
    RAISE EXCEPTION 'room_not_in_war';
  END IF;

  -- Membership check
  IF NOT EXISTS (
    SELECT 1 FROM public.room_members WHERE room_id = _room_id AND user_id = v_user
  ) AND NOT EXISTS (
    SELECT 1 FROM public.rooms WHERE id = _room_id AND host_id = v_user
  ) THEN
    RAISE EXCEPTION 'not_in_room';
  END IF;

  IF _room_id = v_war.room_a THEN
    UPDATE public.turf_wars SET score_a = score_a + _amount WHERE id = _war_id RETURNING * INTO v_war;
  ELSE
    UPDATE public.turf_wars SET score_b = score_b + _amount WHERE id = _war_id RETURNING * INTO v_war;
  END IF;

  RETURN v_war;
END;
$$;

GRANT EXECUTE ON FUNCTION public.add_turf_war_points(UUID, UUID, INTEGER) TO authenticated;

-- =================
-- RPC: finalize_turf_war — anyone can call; only finalizes if ends_at passed and still active.
-- =================
CREATE OR REPLACE FUNCTION public.finalize_turf_war(_war_id UUID)
RETURNS public.turf_wars
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_war public.turf_wars;
  v_winner UUID;
BEGIN
  SELECT * INTO v_war FROM public.turf_wars WHERE id = _war_id FOR UPDATE;
  IF v_war.id IS NULL THEN RAISE EXCEPTION 'war_not_found'; END IF;
  IF v_war.status <> 'active' THEN RETURN v_war; END IF;
  IF v_war.ends_at IS NULL OR v_war.ends_at > now() THEN RETURN v_war; END IF;

  IF v_war.score_a > v_war.score_b THEN v_winner := v_war.room_a;
  ELSIF v_war.score_b > v_war.score_a THEN v_winner := v_war.room_b;
  ELSE v_winner := NULL; END IF;

  UPDATE public.turf_wars
    SET status = 'finished', winner_room = v_winner
    WHERE id = _war_id RETURNING * INTO v_war;
  RETURN v_war;
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_turf_war(UUID) TO authenticated;

-- =================
-- RPC: cancel_turf_war (host of either room may cancel a pending war)
-- =================
CREATE OR REPLACE FUNCTION public.cancel_turf_war(_war_id UUID)
RETURNS public.turf_wars
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_war public.turf_wars;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  SELECT * INTO v_war FROM public.turf_wars WHERE id = _war_id FOR UPDATE;
  IF v_war.id IS NULL THEN RAISE EXCEPTION 'war_not_found'; END IF;
  IF v_user <> v_war.host_a AND v_user <> v_war.host_b THEN
    RAISE EXCEPTION 'not_host';
  END IF;
  IF v_war.status NOT IN ('pending','active') THEN RETURN v_war; END IF;
  UPDATE public.turf_wars SET status = 'cancelled' WHERE id = _war_id RETURNING * INTO v_war;
  RETURN v_war;
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_turf_war(UUID) TO authenticated;
