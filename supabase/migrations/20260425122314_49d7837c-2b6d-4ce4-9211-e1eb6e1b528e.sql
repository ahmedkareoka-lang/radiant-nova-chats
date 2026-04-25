-- 1) Add relationship_type column to existing love_couples
ALTER TABLE public.love_couples 
  ADD COLUMN IF NOT EXISTS relationship_type text NOT NULL DEFAULT 'lover',
  ADD COLUMN IF NOT EXISTS anniversary_date timestamptz NOT NULL DEFAULT now();

-- Validation: only allowed types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'love_couples_type_check') THEN
    ALTER TABLE public.love_couples 
      ADD CONSTRAINT love_couples_type_check 
      CHECK (relationship_type IN ('lover', 'married', 'bestie'));
  END IF;
END $$;

-- 2) Create relationship_requests table
CREATE TABLE IF NOT EXISTS public.relationship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  relationship_type text NOT NULL CHECK (relationship_type IN ('lover', 'married', 'bestie')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'expired')),
  message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_rel_req_receiver ON public.relationship_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_rel_req_sender ON public.relationship_requests(sender_id, status);

ALTER TABLE public.relationship_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Users can read requests they're involved in
CREATE POLICY "Users read own requests" ON public.relationship_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- RLS: Users can send requests (validated in RPC for follow/balance)
CREATE POLICY "Users send requests" ON public.relationship_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND status = 'pending');

-- RLS: Receiver can update (accept/reject), sender can cancel
CREATE POLICY "Parties update requests" ON public.relationship_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = receiver_id OR auth.uid() = sender_id);

-- 3) Costs config function
CREATE OR REPLACE FUNCTION public.get_relationship_cost(_type text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE _type
    WHEN 'lover' THEN 10000::bigint
    WHEN 'married' THEN 50000::bigint
    WHEN 'bestie' THEN 5000::bigint
    ELSE 10000::bigint
  END
$$;

-- 4) Send a relationship request (validates follow + checks no active couple)
CREATE OR REPLACE FUNCTION public.send_relationship_request(
  _receiver_id uuid,
  _type text,
  _message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender uuid := auth.uid();
  _req_id uuid;
  _existing_couple_count int;
  _existing_pending int;
BEGIN
  IF _sender IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _sender = _receiver_id THEN RAISE EXCEPTION 'لا يمكنك إرسال طلب لنفسك'; END IF;
  IF _type NOT IN ('lover', 'married', 'bestie') THEN RAISE EXCEPTION 'نوع علاقة غير صالح'; END IF;

  -- Must follow the receiver
  IF NOT EXISTS (SELECT 1 FROM follows WHERE follower_id = _sender AND following_id = _receiver_id) THEN
    RAISE EXCEPTION 'يجب أن تتابع هذا الشخص أولاً';
  END IF;

  -- Sender must not have any active couple
  SELECT COUNT(*) INTO _existing_couple_count
  FROM love_couples
  WHERE is_active = true AND (user1_id = _sender OR user2_id = _sender);
  IF _existing_couple_count > 0 THEN
    RAISE EXCEPTION 'لديك علاقة نشطة بالفعل';
  END IF;

  -- Receiver must not have any active couple
  SELECT COUNT(*) INTO _existing_couple_count
  FROM love_couples
  WHERE is_active = true AND (user1_id = _receiver_id OR user2_id = _receiver_id);
  IF _existing_couple_count > 0 THEN
    RAISE EXCEPTION 'الشخص المُختار لديه علاقة نشطة بالفعل';
  END IF;

  -- No duplicate pending request between same pair
  SELECT COUNT(*) INTO _existing_pending
  FROM relationship_requests
  WHERE status = 'pending' 
    AND ((sender_id = _sender AND receiver_id = _receiver_id) 
      OR (sender_id = _receiver_id AND receiver_id = _sender));
  IF _existing_pending > 0 THEN
    RAISE EXCEPTION 'يوجد طلب معلّق بالفعل';
  END IF;

  INSERT INTO relationship_requests (sender_id, receiver_id, relationship_type, message)
  VALUES (_sender, _receiver_id, _type, _message)
  RETURNING id INTO _req_id;

  -- Notify the receiver
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    _receiver_id,
    'relationship_request',
    CASE _type
      WHEN 'lover' THEN '💕 طلب حبيبين جديد'
      WHEN 'married' THEN '💍 طلب زواج جديد'
      ELSE '🤝 طلب صداقة روح'
    END,
    'لديك طلب علاقة جديد. افتح صفحة العلاقات لمراجعته.'
  );

  RETURN _req_id;
END;
$$;

-- 5) Accept relationship request (charges sender, creates couple)
CREATE OR REPLACE FUNCTION public.accept_relationship_request(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _req record;
  _cost bigint;
  _sender_coins bigint;
  _couple_id uuid;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO _req FROM relationship_requests 
   WHERE id = _request_id AND receiver_id = _me AND status = 'pending'
   FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود أو تمت معالجته'; END IF;
  IF _req.expires_at < now() THEN
    UPDATE relationship_requests SET status = 'expired' WHERE id = _request_id;
    RAISE EXCEPTION 'انتهت صلاحية الطلب';
  END IF;

  -- Re-check no active couple for either side
  IF EXISTS (SELECT 1 FROM love_couples WHERE is_active = true 
             AND (user1_id IN (_req.sender_id, _me) OR user2_id IN (_req.sender_id, _me))) THEN
    RAISE EXCEPTION 'أحد الطرفين لديه علاقة نشطة';
  END IF;

  _cost := get_relationship_cost(_req.relationship_type);

  -- Charge sender
  SELECT coins INTO _sender_coins FROM profiles WHERE id = _req.sender_id FOR UPDATE;
  IF _sender_coins < _cost THEN
    UPDATE relationship_requests SET status = 'rejected', responded_at = now() WHERE id = _request_id;
    INSERT INTO notifications (user_id, type, title, message)
    VALUES (_req.sender_id, 'relationship_failed', '⚠️ فشل التفعيل',
            'تم قبول طلبك لكن رصيدك لا يكفي لإتمام العلاقة.');
    RAISE EXCEPTION 'رصيد المُرسِل لا يكفي';
  END IF;
  UPDATE profiles SET coins = coins - _cost WHERE id = _req.sender_id;

  -- Create couple
  INSERT INTO love_couples (user1_id, user2_id, relationship_type, love_points, love_level, is_active, anniversary_date, activated_at)
  VALUES (_req.sender_id, _me, _req.relationship_type, 0, 1, true, now(), now())
  RETURNING id INTO _couple_id;

  -- Update request
  UPDATE relationship_requests SET status = 'accepted', responded_at = now() WHERE id = _request_id;

  -- Notify sender
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (
    _req.sender_id,
    'relationship_accepted',
    '🎉 تم قبول طلبك!',
    CASE _req.relationship_type
      WHEN 'lover' THEN 'تهانينا! أصبحتما حبيبين 💕'
      WHEN 'married' THEN 'مبروك الزواج! 💍'
      ELSE 'تم تفعيل صداقة الروح 🤝'
    END
  );

  RETURN _couple_id;
END;
$$;

-- 6) Reject relationship request
CREATE OR REPLACE FUNCTION public.reject_relationship_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _req record;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO _req FROM relationship_requests 
   WHERE id = _request_id AND receiver_id = _me AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'الطلب غير موجود'; END IF;

  UPDATE relationship_requests SET status = 'rejected', responded_at = now() WHERE id = _request_id;
  INSERT INTO notifications (user_id, type, title, message)
  VALUES (_req.sender_id, 'relationship_rejected', '💔 تم رفض طلبك', 'لم يتم قبول طلب العلاقة هذه المرة.');
END;
$$;

-- 7) Cancel pending request (sender)
CREATE OR REPLACE FUNCTION public.cancel_relationship_request(_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _me uuid := auth.uid();
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  UPDATE relationship_requests 
     SET status = 'cancelled', responded_at = now() 
   WHERE id = _request_id AND sender_id = _me AND status = 'pending';
END;
$$;

-- 8) Realtime publication for instant request updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationship_requests;