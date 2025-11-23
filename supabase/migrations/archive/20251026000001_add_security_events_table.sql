-- Security Events Table
-- Logs all security-related events for monitoring and auditing

-- Create security_events table
CREATE TABLE IF NOT EXISTS security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'sql_injection',
    'xss_attempt',
    'csrf_violation',
    'rate_limit_exceeded',
    'suspicious_file_upload',
    'permission_violation',
    'failed_login_attempt',
    'admin_action'
  )),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  request_method TEXT,
  request_path TEXT,
  request_body JSONB,
  response_status INTEGER,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for efficient querying
CREATE INDEX idx_security_events_event_type ON security_events(event_type);
CREATE INDEX idx_security_events_severity ON security_events(severity);
CREATE INDEX idx_security_events_user_id ON security_events(user_id);
CREATE INDEX idx_security_events_created_at ON security_events(created_at DESC);
CREATE INDEX idx_security_events_ip_address ON security_events(ip_address);

-- Composite index for common queries
CREATE INDEX idx_security_events_type_severity_created ON security_events(event_type, severity, created_at DESC);

-- Add comment
COMMENT ON TABLE security_events IS 'Security events log for monitoring and auditing';
COMMENT ON COLUMN security_events.event_type IS 'Type of security event (sql_injection, xss_attempt, etc.)';
COMMENT ON COLUMN security_events.severity IS 'Severity level of the event (low, medium, high, critical)';
COMMENT ON COLUMN security_events.details IS 'Additional details about the event (JSON)';

-- Enable RLS
ALTER TABLE security_events ENABLE ROW LEVEL SECURITY;

-- Admin can view all security events
CREATE POLICY "Admins can view all security events"
  ON security_events
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

-- Only system can insert security events (via service role)
-- No policy for INSERT - must use service role

-- Cleanup old security events (older than 90 days)
-- This will be run periodically via cron job or manually
CREATE OR REPLACE FUNCTION cleanup_old_security_events()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM security_events
  WHERE created_at < now() - interval '90 days';
END;
$$;

COMMENT ON FUNCTION cleanup_old_security_events IS 'Delete security events older than 90 days to save storage';
