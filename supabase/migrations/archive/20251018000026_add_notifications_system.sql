-- Migration: Add notifications system
-- Description: Create notifications table with triggers for auto-notification generation

-- Create notification_type enum
CREATE TYPE notification_type AS ENUM (
  'comment',           -- Someone commented on your post
  'reply',             -- Someone replied to your comment
  'like_post',         -- Someone liked your post
  'like_comment',      -- Someone liked your comment
  'edit_approved',     -- Your edit request was approved
  'edit_rejected',     -- Your edit request was rejected
  'claim_approved',    -- Your player claim was approved
  'claim_rejected',    -- Your player claim was rejected
  'mention'            -- Someone mentioned you
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,

  -- Related content (optional, depends on notification type)
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES hands(id) ON DELETE CASCADE,
  edit_request_id UUID REFERENCES hand_edit_requests(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES player_claims(id) ON DELETE CASCADE,

  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate notifications
  CONSTRAINT unique_notification UNIQUE (recipient_id, type, post_id, comment_id, sender_id, created_at)
);

-- Index for fast queries
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(recipient_id, is_read, created_at DESC) WHERE is_read = FALSE;

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (recipient_id = auth.uid());

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (recipient_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  USING (recipient_id = auth.uid());

-- System can insert notifications (for triggers)
CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_recipient_id UUID,
  p_sender_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_link TEXT DEFAULT NULL,
  p_post_id UUID DEFAULT NULL,
  p_comment_id UUID DEFAULT NULL,
  p_hand_id UUID DEFAULT NULL,
  p_edit_request_id UUID DEFAULT NULL,
  p_claim_id UUID DEFAULT NULL
) RETURNS void AS $$
BEGIN
  -- Don't create notification if sender = recipient
  IF p_sender_id = p_recipient_id THEN
    RETURN;
  END IF;

  -- Insert notification (ignore duplicates)
  INSERT INTO notifications (
    recipient_id,
    sender_id,
    type,
    title,
    message,
    link,
    post_id,
    comment_id,
    hand_id,
    edit_request_id,
    claim_id
  ) VALUES (
    p_recipient_id,
    p_sender_id,
    p_type,
    p_title,
    p_message,
    p_link,
    p_post_id,
    p_comment_id,
    p_hand_id,
    p_edit_request_id,
    p_claim_id
  )
  ON CONFLICT ON CONSTRAINT unique_notification DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: Notify when someone comments on a post
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  sender_name TEXT;
  post_title TEXT;
BEGIN
  -- Get post author and title
  SELECT author_id, title INTO post_author, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.author_id;

  -- Create notification
  IF post_author IS NOT NULL THEN
    PERFORM create_notification(
      post_author,
      NEW.author_id,
      'comment'::notification_type,
      'New Comment',
      sender_name || ' commented on your post: "' || post_title || '"',
      '/community/' || NEW.post_id,
      NEW.post_id,
      NEW.id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_post_comment
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL AND NEW.parent_comment_id IS NULL)
  EXECUTE FUNCTION notify_post_comment();

-- Trigger: Notify when someone replies to a comment
CREATE OR REPLACE FUNCTION notify_comment_reply()
RETURNS TRIGGER AS $$
DECLARE
  parent_author UUID;
  sender_name TEXT;
  parent_content TEXT;
BEGIN
  -- Get parent comment author
  SELECT author_id, content INTO parent_author, parent_content
  FROM comments
  WHERE id = NEW.parent_comment_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.author_id;

  -- Create notification
  IF parent_author IS NOT NULL THEN
    PERFORM create_notification(
      parent_author,
      NEW.author_id,
      'reply'::notification_type,
      'New Reply',
      sender_name || ' replied to your comment',
      '/community/' || NEW.post_id || '#comment-' || NEW.id,
      NEW.post_id,
      NEW.id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_comment_reply
  AFTER INSERT ON comments
  FOR EACH ROW
  WHEN (NEW.parent_comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_comment_reply();

-- Trigger: Notify when someone likes a post
CREATE OR REPLACE FUNCTION notify_post_like()
RETURNS TRIGGER AS $$
DECLARE
  post_author UUID;
  sender_name TEXT;
  post_title TEXT;
BEGIN
  -- Only notify for post likes (not comment likes)
  IF NEW.post_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get post author and title
  SELECT author_id, title INTO post_author, post_title
  FROM posts
  WHERE id = NEW.post_id;

  -- Get sender name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.user_id;

  -- Create notification
  IF post_author IS NOT NULL THEN
    PERFORM create_notification(
      post_author,
      NEW.user_id,
      'like_post'::notification_type,
      'New Like',
      sender_name || ' liked your post: "' || post_title || '"',
      '/community/' || NEW.post_id,
      NEW.post_id,
      NULL,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_post_like
  AFTER INSERT ON likes
  FOR EACH ROW
  WHEN (NEW.post_id IS NOT NULL)
  EXECUTE FUNCTION notify_post_like();

-- Trigger: Notify when someone likes a comment
CREATE OR REPLACE FUNCTION notify_comment_like()
RETURNS TRIGGER AS $$
DECLARE
  comment_author UUID;
  sender_name TEXT;
  comment_post UUID;
BEGIN
  -- Only notify for comment likes
  IF NEW.comment_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Get comment author and post
  SELECT author_id, post_id INTO comment_author, comment_post
  FROM comments
  WHERE id = NEW.comment_id;

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
      sender_name || ' liked your comment',
      '/community/' || comment_post || '#comment-' || NEW.comment_id,
      comment_post,
      NEW.comment_id,
      NULL,
      NULL,
      NULL
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_comment_like
  AFTER INSERT ON likes
  FOR EACH ROW
  WHEN (NEW.comment_id IS NOT NULL)
  EXECUTE FUNCTION notify_comment_like();

-- Trigger: Notify when edit request is approved/rejected
CREATE OR REPLACE FUNCTION notify_edit_request_status()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  hand_number TEXT;
  notif_type notification_type;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF NEW.status = OLD.status OR (NEW.status != 'approved' AND NEW.status != 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get admin name (who approved/rejected)
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.reviewed_by;

  -- Get hand number
  SELECT number INTO hand_number
  FROM hands
  WHERE id = NEW.hand_id;

  -- Set notification type and message
  IF NEW.status = 'approved' THEN
    notif_type := 'edit_approved'::notification_type;
    notif_title := 'Edit Request Approved';
    notif_message := 'Your edit request for Hand #' || hand_number || ' was approved';
  ELSE
    notif_type := 'edit_rejected'::notification_type;
    notif_title := 'Edit Request Rejected';
    notif_message := 'Your edit request for Hand #' || hand_number || ' was rejected';
  END IF;

  -- Create notification
  PERFORM create_notification(
    NEW.user_id,
    NEW.reviewed_by,
    notif_type,
    notif_title,
    notif_message,
    '/my-edit-requests',
    NULL,
    NULL,
    NEW.hand_id,
    NEW.id,
    NULL
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_edit_request_status
  AFTER UPDATE ON hand_edit_requests
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_edit_request_status();

-- Trigger: Notify when player claim is approved/rejected
CREATE OR REPLACE FUNCTION notify_claim_status()
RETURNS TRIGGER AS $$
DECLARE
  sender_name TEXT;
  player_name TEXT;
  notif_type notification_type;
  notif_title TEXT;
  notif_message TEXT;
BEGIN
  -- Only notify when status changes to approved or rejected
  IF NEW.status = OLD.status OR (NEW.status != 'approved' AND NEW.status != 'rejected') THEN
    RETURN NEW;
  END IF;

  -- Get admin name
  SELECT nickname INTO sender_name
  FROM users
  WHERE id = NEW.reviewed_by;

  -- Get player name
  SELECT name INTO player_name
  FROM players
  WHERE id = NEW.player_id;

  -- Set notification type and message
  IF NEW.status = 'approved' THEN
    notif_type := 'claim_approved'::notification_type;
    notif_title := 'Player Claim Approved';
    notif_message := 'Your claim for player "' || player_name || '" was approved';
  ELSE
    notif_type := 'claim_rejected'::notification_type;
    notif_title := 'Player Claim Rejected';
    notif_message := 'Your claim for player "' || player_name || '" was rejected';
  END IF;

  -- Create notification
  PERFORM create_notification(
    NEW.user_id,
    NEW.reviewed_by,
    notif_type,
    notif_title,
    notif_message,
    '/players/' || NEW.player_id,
    NULL,
    NULL,
    NULL,
    NULL,
    NEW.id
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_claim_status
  AFTER UPDATE ON player_claims
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_claim_status();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
