
-- Server-side mic access validation function
CREATE OR REPLACE FUNCTION public.validate_mic_access(
  _user_id uuid,
  _room_id uuid,
  _slot integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_vip integer;
  room_mic_count integer;
  slot_locked boolean;
  slot_occupied boolean;
  user_banned boolean;
BEGIN
  -- Check if user is banned from room
  SELECT EXISTS(SELECT 1 FROM room_bans WHERE room_id = _room_id AND user_id = _user_id) INTO user_banned;
  IF user_banned THEN RETURN false; END IF;

  -- Get room mic count
  SELECT mic_count INTO room_mic_count FROM rooms WHERE id = _room_id AND is_active = true;
  IF room_mic_count IS NULL THEN RETURN false; END IF;

  -- Check slot is within range
  IF _slot < 0 OR _slot >= room_mic_count THEN RETURN false; END IF;

  -- Check if slot is locked
  SELECT _slot = ANY(COALESCE(locked_slots, '{}')) INTO slot_locked FROM rooms WHERE id = _room_id;
  IF slot_locked THEN
    -- Only host or admin can sit on locked slots
    IF NOT EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND host_id = _user_id)
       AND NOT has_role(_user_id, 'admin')
    THEN RETURN false; END IF;
  END IF;

  -- Check if slot is occupied by someone else
  SELECT EXISTS(SELECT 1 FROM room_members WHERE room_id = _room_id AND mic_slot = _slot AND user_id != _user_id) INTO slot_occupied;
  IF slot_occupied THEN RETURN false; END IF;

  -- Check if user is muted in this room
  IF EXISTS(SELECT 1 FROM rooms WHERE id = _room_id AND _user_id = ANY(COALESCE(muted_users, '{}'))) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Trigger: auto-notify receiver on gift transaction
CREATE OR REPLACE FUNCTION public.notify_gift_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name text;
BEGIN
  SELECT display_name INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  INSERT INTO notifications (user_id, title, message, type)
  VALUES (
    NEW.receiver_id,
    'هدية جديدة! 🎁',
    'حصلت على ' || NEW.gift_name || ' بقيمة ' || NEW.diamond_amount || ' ماسة من ' || COALESCE(sender_name, 'مستخدم'),
    'gift'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_gift_received ON gift_transactions;
CREATE TRIGGER trg_notify_gift_received
  AFTER INSERT ON gift_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_gift_received();

-- Trigger: auto-notify on agency invite status change
CREATE OR REPLACE FUNCTION public.notify_agency_invite_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  agency_name text;
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
    SELECT name INTO agency_name FROM agencies WHERE id = NEW.agency_id;
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      NEW.target_user_id,
      CASE WHEN NEW.status = 'accepted' THEN 'تم قبول طلب الوكالة ✅' ELSE 'تم رفض طلب الوكالة ❌' END,
      'طلبك في وكالة ' || COALESCE(agency_name, '') || ' تم ' || CASE WHEN NEW.status = 'accepted' THEN 'قبوله' ELSE 'رفضه' END,
      'agency'
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_agency_invite ON agency_invites;
CREATE TRIGGER trg_notify_agency_invite
  AFTER UPDATE ON agency_invites
  FOR EACH ROW
  EXECUTE FUNCTION notify_agency_invite_change();
