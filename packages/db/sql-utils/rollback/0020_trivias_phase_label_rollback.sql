-- Rollback for 0020_trivias_phase_label.sql
-- Apply this AFTER 0021 rollback. Reverts the trivias rename: phase_label TEXT -> phase_transition INTEGER.
--
-- WARNING: The reverse mapping only covers phase_label values that round-trip back to 1..5.
-- If any trivia row uses 'groups_m1', 'sf', or 'final_phase' (not part of the original CHECK
-- BETWEEN 1 AND 5), the ELSE NULL below will leave that row's phase_transition as NULL and
-- the subsequent SET NOT NULL will FAIL loudly. Decide before running:
--   (a) delete those rows manually,
--   (b) assign them to a numeric fallback by editing the CASE,
--   (c) skip rollback (keep the new schema).
--
-- After running, delete the corresponding entry from meta/_journal.json (idx: 20).

BEGIN;

ALTER TABLE trivias ADD COLUMN phase_transition INTEGER;

UPDATE trivias SET phase_transition = CASE phase_label
  WHEN 'groups_m2' THEN 1
  WHEN 'groups_m3' THEN 2
  WHEN 'r32'       THEN 3
  WHEN 'r16'       THEN 4
  WHEN 'qf'        THEN 5
  ELSE NULL
END;

-- Sanity check before SET NOT NULL — fail fast if any row didn't map.
DO $$
DECLARE
  unmapped INT;
BEGIN
  SELECT COUNT(*) INTO unmapped FROM trivias WHERE phase_transition IS NULL;
  IF unmapped > 0 THEN
    RAISE EXCEPTION 'Rollback aborted: % trivia row(s) have phase_label outside the original 1..5 range. Resolve manually.', unmapped;
  END IF;
END $$;

ALTER TABLE trivias ALTER COLUMN phase_transition SET NOT NULL;

ALTER TABLE trivias DROP CONSTRAINT IF EXISTS trivias_phase_label_check;
ALTER TABLE trivias ADD CONSTRAINT trivias_phase_check CHECK (phase_transition BETWEEN 1 AND 5);

ALTER TABLE trivias DROP COLUMN phase_label;

COMMIT;
