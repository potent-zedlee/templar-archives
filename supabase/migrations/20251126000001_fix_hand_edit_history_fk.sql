-- Fix hand_edit_history editor_id FK constraint
-- Allow NULL editor_id for system/automated inserts

-- 1. Drop existing FK constraint
ALTER TABLE public.hand_edit_history
DROP CONSTRAINT IF EXISTS hand_edit_history_editor_id_fkey;

-- 2. Allow NULL for editor_id
ALTER TABLE public.hand_edit_history
ALTER COLUMN editor_id DROP NOT NULL;

-- 3. Add new FK with ON DELETE SET NULL
ALTER TABLE public.hand_edit_history
ADD CONSTRAINT hand_edit_history_editor_id_fkey
FOREIGN KEY (editor_id)
REFERENCES public.users(id)
ON DELETE SET NULL;

-- 4. Update trigger function to use NULL instead of placeholder UUID
CREATE OR REPLACE FUNCTION public.log_hand_edit() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_changed_fields JSONB;
BEGIN
  -- INSERT 작업
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      new_data
    ) VALUES (
      NEW.id,
      auth.uid(),  -- NULL for system inserts (now allowed)
      'create',
      to_jsonb(NEW)
    );
    RETURN NEW;

  -- UPDATE 작업
  ELSIF TG_OP = 'UPDATE' THEN
    v_changed_fields := jsonb_build_object(
      'description', CASE WHEN OLD.description IS DISTINCT FROM NEW.description THEN jsonb_build_object('old', OLD.description, 'new', NEW.description) ELSE NULL END,
      'small_blind', CASE WHEN OLD.small_blind IS DISTINCT FROM NEW.small_blind THEN jsonb_build_object('old', OLD.small_blind, 'new', NEW.small_blind) ELSE NULL END,
      'big_blind', CASE WHEN OLD.big_blind IS DISTINCT FROM NEW.big_blind THEN jsonb_build_object('old', OLD.big_blind, 'new', NEW.big_blind) ELSE NULL END,
      'ante', CASE WHEN OLD.ante IS DISTINCT FROM NEW.ante THEN jsonb_build_object('old', OLD.ante, 'new', NEW.ante) ELSE NULL END,
      'pot_size', CASE WHEN OLD.pot_size IS DISTINCT FROM NEW.pot_size THEN jsonb_build_object('old', OLD.pot_size, 'new', NEW.pot_size) ELSE NULL END,
      'board_flop', CASE WHEN OLD.board_flop IS DISTINCT FROM NEW.board_flop THEN jsonb_build_object('old', OLD.board_flop, 'new', NEW.board_flop) ELSE NULL END,
      'board_turn', CASE WHEN OLD.board_turn IS DISTINCT FROM NEW.board_turn THEN jsonb_build_object('old', OLD.board_turn, 'new', NEW.board_turn) ELSE NULL END,
      'board_river', CASE WHEN OLD.board_river IS DISTINCT FROM NEW.board_river THEN jsonb_build_object('old', OLD.board_river, 'new', NEW.board_river) ELSE NULL END
    );

    v_changed_fields := (
      SELECT jsonb_object_agg(key, value)
      FROM jsonb_each(v_changed_fields)
      WHERE value IS NOT NULL
    );

    IF v_changed_fields IS NOT NULL AND jsonb_object_keys(v_changed_fields) IS NOT NULL THEN
      INSERT INTO public.hand_edit_history (
        hand_id,
        editor_id,
        edit_type,
        previous_data,
        new_data,
        changed_fields
      ) VALUES (
        NEW.id,
        auth.uid(),  -- NULL for system inserts
        'update',
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_changed_fields
      );
    END IF;

    RETURN NEW;

  -- DELETE 작업
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.hand_edit_history (
      hand_id,
      editor_id,
      edit_type,
      previous_data
    ) VALUES (
      OLD.id,
      auth.uid(),  -- NULL for system inserts
      'delete',
      to_jsonb(OLD)
    );
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.log_hand_edit() IS 'Automatically log hand edits to hand_edit_history. editor_id is NULL for system/automated operations.';
