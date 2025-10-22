-- Migration: Add notification triggers for hand comments and likes
-- Description: Create triggers to notify users when someone comments on or likes their hand

-- Trigger: Notify when someone comments on a hand
CREATE OR REPLACE FUNCTION notify_hand_comment()
RETURNS TRIGGER AS $$
DECLARE
  hand_author UUID;
  sender_name TEXT;
  hand_number TEXT;
BEGIN
  -- Don't notify if the commenter is the hand author
  IF NEW.user_id = (
    SELECT hp.player_id
    FROM hand_players hp
    INNER JOIN players p ON hp.player_id = p.id
    WHERE hp.hand_id = NEW.hand_id
    LIMIT 1
  ) THEN
    RETURN NEW;
  END IF;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands
  WHERE id = NEW.hand_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Get hand author (first player in the hand for simplicity)
  SELECT hp.player_id INTO hand_author
  FROM hand_players hp
  WHERE hp.hand_id = NEW.hand_id
  LIMIT 1;

  -- Create notification if hand author exists
  IF hand_author IS NOT NULL THEN
    PERFORM create_notification(
      hand_author,
      NEW.user_id,
      'comment'::notification_type,
      'New Hand Comment',
      sender_name || ' commented on Hand #' || hand_number,
      '/archive?hand=' || NEW.hand_id,
      NULL,
      NULL,
      NEW.hand_id,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_hand_comment
  AFTER INSERT ON hand_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_hand_comment();

-- Trigger: Notify when someone replies to a hand comment
CREATE OR REPLACE FUNCTION notify_hand_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_author UUID;
  sender_name TEXT;
  hand_number TEXT;
BEGIN
  -- Only process replies (not top-level comments)
  IF NEW.parent_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get parent comment author
  SELECT user_id INTO parent_author
  FROM hand_comments
  WHERE id = NEW.parent_comment_id;

  -- Don't notify if replying to own comment
  IF parent_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands
  WHERE id = NEW.hand_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  IF parent_author IS NOT NULL THEN
    PERFORM create_notification(
      parent_author,
      NEW.user_id,
      'reply'::notification_type,
      'New Reply',
      sender_name || ' replied to your comment on Hand #' || hand_number,
      '/archive?hand=' || NEW.hand_id || '#comment-' || NEW.id,
      NULL,
      NULL,
      NEW.hand_id,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_hand_comment_reply
  AFTER INSERT ON hand_comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_hand_comment_reply();

-- Trigger: Notify when someone likes a hand
CREATE OR REPLACE FUNCTION notify_hand_like()
RETURNS TRIGGER AS $$
DECLARE
  hand_author UUID;
  sender_name TEXT;
  hand_number TEXT;
BEGIN
  -- Only process hand likes (not hand comment likes)
  IF NEW.hand_id IS NULL OR NEW.hand_comment_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands
  WHERE id = NEW.hand_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Get hand author (first player in the hand)
  SELECT hp.player_id INTO hand_author
  FROM hand_players hp
  WHERE hp.hand_id = NEW.hand_id
  LIMIT 1;

  -- Don't notify if liking own hand
  IF hand_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Create notification
  IF hand_author IS NOT NULL THEN
    PERFORM create_notification(
      hand_author,
      NEW.user_id,
      'like_post'::notification_type,
      'New Like',
      sender_name || ' liked Hand #' || hand_number,
      '/archive?hand=' || NEW.hand_id,
      NULL,
      NULL,
      NEW.hand_id,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_hand_like
  AFTER INSERT ON hand_likes
  FOR EACH ROW
  WHEN (NEW.hand_id IS NOT NULL AND NEW.hand_comment_id IS NULL)
  EXECUTE FUNCTION notify_hand_like();

-- Trigger: Notify when someone likes a hand comment
CREATE OR REPLACE FUNCTION notify_hand_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_author UUID;
  sender_name TEXT;
  hand_number TEXT;
BEGIN
  -- Only process hand comment likes
  IF NEW.hand_comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get comment author
  SELECT user_id INTO comment_author
  FROM hand_comments
  WHERE id = NEW.hand_comment_id;

  -- Don't notify if liking own comment
  IF comment_author = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands h
  INNER JOIN hand_comments hc ON h.id = hc.hand_id
  WHERE hc.id = NEW.hand_comment_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  IF comment_author IS NOT NULL THEN
    PERFORM create_notification(
      comment_author,
      NEW.user_id,
      'like_comment'::notification_type,
      'New Like',
      sender_name || ' liked your comment on Hand #' || hand_number,
      '/archive?hand=' || NEW.hand_id || '#comment-' || NEW.hand_comment_id,
      NULL,
      NULL,
      NEW.hand_id,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_hand_comment_like
  AFTER INSERT ON hand_likes
  FOR EACH ROW
  WHEN (NEW.hand_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_hand_comment_like();
