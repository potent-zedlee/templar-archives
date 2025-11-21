-- Add system_configs table for dynamic prompt management
-- This allows admins to update AI prompts without code deployment

-- Create system_configs table
CREATE TABLE IF NOT EXISTS system_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

COMMENT ON TABLE system_configs IS 'System-wide configuration settings (prompts, feature flags, etc.)';
COMMENT ON COLUMN system_configs.key IS 'Unique configuration key (e.g., ai_prompt_ept)';
COMMENT ON COLUMN system_configs.value IS 'Configuration value (JSONB for flexibility)';
COMMENT ON COLUMN system_configs.description IS 'Human-readable description';
COMMENT ON COLUMN system_configs.updated_by IS 'User who last updated this config';

-- Insert EPT prompt (basic template - update via Admin UI for full version)
INSERT INTO system_configs (key, value, description) VALUES (
  'ai_prompt_ept',
  jsonb_build_object(
    'content', 'You are a poker hand history analyzer specialized in EPT (European Poker Tour) broadcasts. Analyze the provided video segment and extract detailed hand histories in structured JSON format. Include: hand metadata, players (name, position, seat, stack, hole cards), actions (player, street, action type, amount), board cards (flop, turn, river), and winners. Player names are ALWAYS UPPERCASE in EPT. Use lowercase suits (h/d/c/s) for cards. Output valid JSON only.',
    'version', 1,
    'platform', 'ept'
  ),
  'EPT (European Poker Tour) video analysis prompt'
);

-- Insert Triton prompt (basic template - update via Admin UI for full version)
INSERT INTO system_configs (key, value, description) VALUES (
  'ai_prompt_triton',
  jsonb_build_object(
    'content', 'You are a poker hand history analyzer specialized in Triton Poker broadcasts. Analyze the provided video segment and extract detailed hand histories in structured JSON format. Include: hand metadata, players (name, position, seat, stack, hole cards), actions (player, street, action type, amount), board cards (flop, turn, river), pot size, and winners. Output valid JSON only.',
    'version', 1,
    'platform', 'triton'
  ),
  'Triton Poker video analysis prompt'
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_configs_key ON system_configs(key);

-- Enable RLS
ALTER TABLE system_configs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Everyone can read configs
CREATE POLICY "system_configs_select_all" ON system_configs
  FOR SELECT
  USING (true);

-- Only admins can insert/update/delete configs
CREATE POLICY "system_configs_insert_admin" ON system_configs
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'high_templar')
      AND banned_at IS NULL
    )
  );

CREATE POLICY "system_configs_update_admin" ON system_configs
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'high_templar')
      AND banned_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'high_templar')
      AND banned_at IS NULL
    )
  );

CREATE POLICY "system_configs_delete_admin" ON system_configs
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('admin', 'high_templar')
      AND banned_at IS NULL
    )
  );

-- Create trigger to auto-update updated_at and updated_by
CREATE OR REPLACE FUNCTION update_system_configs_metadata()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER system_configs_update_metadata
  BEFORE UPDATE ON system_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_system_configs_metadata();
