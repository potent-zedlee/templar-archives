#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const sql = `
-- Drop and recreate the function
DROP FUNCTION IF EXISTS save_hand_with_players_actions CASCADE;

CREATE OR REPLACE FUNCTION save_hand_with_players_actions(
  -- Hand data
  p_day_id UUID,
  p_job_id UUID,
  p_number TEXT,
  p_description TEXT,
  p_timestamp TEXT,
  p_video_timestamp_start INTEGER,
  p_video_timestamp_end INTEGER,
  p_stakes TEXT,
  p_board_flop TEXT[],
  p_board_turn TEXT,
  p_board_river TEXT,
  p_pot_size BIGINT,
  p_raw_data JSONB,

  -- Players data (array of JSONB objects)
  p_players JSONB,

  -- Actions data (array of JSONB objects)
  p_actions JSONB,

  -- Optional parameters
  p_small_blind INTEGER DEFAULT NULL,
  p_big_blind INTEGER DEFAULT NULL,
  p_ante INTEGER DEFAULT 0,
  p_pot_preflop INTEGER DEFAULT NULL,
  p_pot_flop INTEGER DEFAULT NULL,
  p_pot_turn INTEGER DEFAULT NULL,
  p_pot_river INTEGER DEFAULT NULL,
  p_thumbnail_url TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_hand_id UUID;
  v_player JSONB;
  v_action JSONB;
  v_player_id UUID;
  v_hand_player_id UUID;
  v_hole_cards TEXT[];
BEGIN
  -- 1. Insert hand
  INSERT INTO hands (
    day_id,
    job_id,
    number,
    description,
    timestamp,
    video_timestamp_start,
    video_timestamp_end,
    stakes,
    board_flop,
    board_turn,
    board_river,
    pot_size,
    raw_data,
    small_blind,
    big_blind,
    ante,
    pot_preflop,
    pot_flop,
    pot_turn,
    pot_river,
    thumbnail_url
  ) VALUES (
    p_day_id,
    p_job_id,
    p_number,
    p_description,
    p_timestamp,
    p_video_timestamp_start,
    p_video_timestamp_end,
    p_stakes,
    p_board_flop,
    p_board_turn,
    p_board_river,
    p_pot_size,
    p_raw_data,
    p_small_blind,
    p_big_blind,
    p_ante,
    p_pot_preflop,
    p_pot_flop,
    p_pot_turn,
    p_pot_river,
    p_thumbnail_url
  )
  RETURNING id INTO v_hand_id;

  -- 2. Insert players
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    -- Get player_id from JSONB
    v_player_id := (v_player->>'player_id')::UUID;

    -- Convert JSONB array to TEXT[] array for hole_cards
    IF v_player->'hole_cards' IS NOT NULL AND jsonb_typeof(v_player->'hole_cards') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_player->'hole_cards'))
      INTO v_hole_cards;
    ELSE
      v_hole_cards := NULL;
    END IF;

    -- Insert hand_player
    INSERT INTO hand_players (
      hand_id,
      player_id,
      poker_position,
      starting_stack,
      ending_stack,
      hole_cards,
      cards,
      final_amount,
      is_winner,
      hand_description
    ) VALUES (
      v_hand_id,
      v_player_id,
      v_player->>'poker_position',
      (v_player->>'starting_stack')::BIGINT,
      (v_player->>'ending_stack')::BIGINT,
      v_hole_cards,
      v_player->>'cards',
      (v_player->>'final_amount')::BIGINT,
      (v_player->>'is_winner')::BOOLEAN,
      v_player->>'hand_description'
    )
    RETURNING id INTO v_hand_player_id;
  END LOOP;

  -- 3. Insert actions (read action_order from JSON, write to sequence column)
  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    v_player_id := (v_action->>'player_id')::UUID;

    INSERT INTO hand_actions (
      hand_id,
      player_id,
      sequence,
      street,
      action_type,
      amount
    ) VALUES (
      v_hand_id,
      v_player_id,
      (v_action->>'action_order')::INTEGER,  -- Read action_order, write to sequence
      v_action->>'street',
      v_action->>'action_type',
      (v_action->>'amount')::BIGINT
    );
  END LOOP;

  -- Return the new hand ID
  RETURN v_hand_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback is automatic in PostgreSQL functions
    RAISE EXCEPTION 'Failed to save hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION save_hand_with_players_actions IS 'Atomically save hand with all players and actions (reads action_order from JSON, writes to sequence column)';

-- Grant permissions
GRANT EXECUTE ON FUNCTION save_hand_with_players_actions TO service_role;
`

console.log('🔧 Updating RPC function...\n')

try {
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    // Try direct SQL execution via REST API
    console.log('Trying direct SQL execution...')

    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ sql_query: sql })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`)
    }

    console.log('✅ RPC function updated successfully!')
  } else {
    console.log('✅ RPC function updated successfully!')
  }

  console.log('\n📝 Now you can run: node scripts/generate-dummy-hands.mjs')

} catch (err) {
  console.error('❌ Error updating RPC function:', err.message)
  console.log('\n💡 Alternative: Use Supabase Dashboard SQL Editor')
  console.log('   https://supabase.com/dashboard/project/diopilmkehygiqpizvga/sql/new')
  process.exit(1)
}
