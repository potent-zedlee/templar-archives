-- Audit Logs Table
-- Logs all important user and admin actions for auditing

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- e.g., 'create_tournament', 'delete_user', 'ban_user', 'change_role'
  resource_type TEXT,    -- e.g., 'tournament', 'user', 'hand', 'post'
  resource_id UUID,
  old_value JSONB,       -- Previous value (for updates)
  new_value JSONB,       -- New value (for creates/updates)
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,        -- Additional context
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Comment
COMMENT ON TABLE audit_logs IS 'Audit trail for all important user and admin actions';

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'high_templar')
        AND users.banned_at IS NULL
    )
  );

-- Only system can insert audit logs (via service role)
-- No policy for INSERT - must use service role

-- Cleanup old audit logs (older than 180 days = 6 months)
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM audit_logs
  WHERE created_at < now() - interval '180 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Delete audit logs older than 180 days';
