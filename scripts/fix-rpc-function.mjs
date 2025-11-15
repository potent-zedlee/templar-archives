#!/usr/bin/env node
/**
 * Directly execute SQL to fix the RPC function
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

// Parse .env.local file manually
const envContent = readFileSync('.env.local', 'utf-8')
const envVars = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/)
  if (match) {
    envVars[match[1].trim()] = match[2].trim()
  }
})

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  }
})

const sql = `
DROP FUNCTION IF EXISTS save_hand_with_players_actions CASCADE;

CREATE OR REPLACE FUNCTION save_hand_with_players_actions(
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
  p_players JSONB,
  p_actions JSONB,
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
  INSERT INTO hands (
    day_id, job_id, number, description, timestamp,
    video_timestamp_start, video_timestamp_end, stakes,
    board_flop, board_turn, board_river, pot_size, raw_data,
    small_blind, big_blind, ante,
    pot_preflop, pot_flop, pot_turn, pot_river, thumbnail_url
  ) VALUES (
    p_day_id, p_job_id, p_number, p_description, p_timestamp,
    p_video_timestamp_start, p_video_timestamp_end, p_stakes,
    p_board_flop, p_board_turn, p_board_river, p_pot_size, p_raw_data,
    p_small_blind, p_big_blind, p_ante,
    p_pot_preflop, p_pot_flop, p_pot_turn, p_pot_river, p_thumbnail_url
  )
  RETURNING id INTO v_hand_id;

  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    v_player_id := (v_player->>'player_id')::UUID;

    IF v_player->'hole_cards' IS NOT NULL AND jsonb_typeof(v_player->'hole_cards') = 'array' THEN
      SELECT ARRAY(SELECT jsonb_array_elements_text(v_player->'hole_cards'))
      INTO v_hole_cards;
    ELSE
      v_hole_cards := NULL;
    END IF;

    INSERT INTO hand_players (
      hand_id, player_id, poker_position, starting_stack, ending_stack,
      hole_cards, cards, final_amount, is_winner, hand_description
    ) VALUES (
      v_hand_id, v_player_id, v_player->>'poker_position',
      (v_player->>'starting_stack')::BIGINT, (v_player->>'ending_stack')::BIGINT,
      v_hole_cards, v_player->>'cards',
      (v_player->>'final_amount')::BIGINT, (v_player->>'is_winner')::BOOLEAN,
      v_player->>'hand_description'
    )
    RETURNING id INTO v_hand_player_id;
  END LOOP;

  FOR v_action IN SELECT * FROM jsonb_array_elements(p_actions)
  LOOP
    v_player_id := (v_action->>'player_id')::UUID;

    INSERT INTO hand_actions (
      hand_id, player_id, sequence, street, action_type, amount
    ) VALUES (
      v_hand_id, v_player_id,
      (v_action->>'action_order')::INTEGER,
      v_action->>'street', v_action->>'action_type',
      (v_action->>'amount')::BIGINT
    );
  END LOOP;

  RETURN v_hand_id;

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to save hand: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION save_hand_with_players_actions TO service_role;
`

console.log('Executing SQL to fix RPC function...')

const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

if (error) {
  console.error('❌ Error executing SQL:', error)
  console.log('\n Manual fix required:')
  console.log('1. Go to Supabase Dashboard')
  console.log('2. Open SQL Editor')
  console.log('3. Run the migration file: 20251115000003_update_rpc_sequence_column.sql')
} else {
  console.log('✅ SQL executed successfully')
  console.log(data)
}
