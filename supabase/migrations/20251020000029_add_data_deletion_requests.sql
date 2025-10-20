-- Add data deletion requests table (GDPR Right to be Forgotten)
-- Created: 2025-01-20

-- Data deletion requests table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX idx_data_deletion_requests_requested_at ON data_deletion_requests(requested_at DESC);

-- RLS Policies
ALTER TABLE data_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can create deletion requests (one active request at a time)
CREATE POLICY "Users can create deletion requests"
  ON data_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND NOT EXISTS (
      SELECT 1
      FROM data_deletion_requests
      WHERE user_id = auth.uid()
      AND status IN ('pending', 'approved')
    )
  );

-- Admins can view all requests
CREATE POLICY "Admins can view all deletion requests"
  ON data_deletion_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Admins can update requests (approve/reject/complete)
CREATE POLICY "Admins can update deletion requests"
  ON data_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'high_templar')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_data_deletion_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_data_deletion_requests_updated_at
  BEFORE UPDATE ON data_deletion_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_data_deletion_requests_updated_at();

-- Comments
COMMENT ON TABLE data_deletion_requests IS 'GDPR/CCPA data deletion requests from users';
COMMENT ON COLUMN data_deletion_requests.status IS 'pending: awaiting review, approved: approved for deletion, rejected: denied, completed: data deleted';
COMMENT ON COLUMN data_deletion_requests.reason IS 'User-provided reason for deletion request';
COMMENT ON COLUMN data_deletion_requests.admin_notes IS 'Admin notes about the request (internal)';
