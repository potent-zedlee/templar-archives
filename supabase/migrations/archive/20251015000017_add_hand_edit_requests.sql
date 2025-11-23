-- Hand Edit Requests System
-- Allows users to request edits to hand data, reviewed by admins

-- Hand Edit Requests table
CREATE TABLE hand_edit_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hand_id UUID NOT NULL REFERENCES hands(id) ON DELETE CASCADE,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  requester_name TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('basic_info', 'players', 'actions', 'board')),
  original_data JSONB NOT NULL,
  proposed_data JSONB NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  admin_comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_hand_edit_requests_hand_id ON hand_edit_requests(hand_id);
CREATE INDEX idx_hand_edit_requests_requester_id ON hand_edit_requests(requester_id);
CREATE INDEX idx_hand_edit_requests_status ON hand_edit_requests(status);
CREATE INDEX idx_hand_edit_requests_created_at ON hand_edit_requests(created_at DESC);

-- RLS Policies

-- Enable RLS
ALTER TABLE hand_edit_requests ENABLE ROW LEVEL SECURITY;

-- Users can create edit requests
CREATE POLICY "Users can create edit requests"
  ON hand_edit_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = requester_id);

-- Users can view their own edit requests
CREATE POLICY "Users can view their own edit requests"
  ON hand_edit_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = requester_id);

-- Admins can view all edit requests
CREATE POLICY "Admins can view all edit requests"
  ON hand_edit_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Admins can update edit requests (approve/reject)
CREATE POLICY "Admins can update edit requests"
  ON hand_edit_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Comments for documentation
COMMENT ON TABLE hand_edit_requests IS 'User-submitted edit requests for hand data';
COMMENT ON COLUMN hand_edit_requests.edit_type IS 'Type of edit: basic_info, players, actions, board';
COMMENT ON COLUMN hand_edit_requests.original_data IS 'Original data before edit (JSON)';
COMMENT ON COLUMN hand_edit_requests.proposed_data IS 'Proposed changes (JSON)';
COMMENT ON COLUMN hand_edit_requests.status IS 'Request status: pending, approved, rejected';
