-- Split groups into 3 matchdays
-- ORDER MATTERS: backfill FIRST, then add CHECK constraints

ALTER TABLE matches DROP CONSTRAINT IF EXISTS matches_phase_check;
ALTER TABLE phase_submissions DROP CONSTRAINT IF EXISTS ps_phase_check;
ALTER TABLE phase_submissions DROP CONSTRAINT IF EXISTS phase_submissions_phase_check;

-- Backfill BEFORE adding new CHECK (rows still have 'groups')
UPDATE matches
SET phase = CASE
  WHEN starts_at < '2026-06-18T02:00:00Z' THEN 'groups_m1'
  WHEN starts_at < '2026-06-24T02:00:00Z' THEN 'groups_m2'
  ELSE 'groups_m3'
END
WHERE phase = 'groups';

-- Now safe to add CHECK — no 'groups' rows remain
ALTER TABLE matches
  ADD CONSTRAINT matches_phase_check
  CHECK (phase IN (
    'groups_m1', 'groups_m2', 'groups_m3',
    'r32', 'r16', 'qf', 'sf', 'final_phase'
  ));

ALTER TABLE phase_submissions
  ADD CONSTRAINT ps_phase_check
  CHECK (phase IN (
    'groups_m1', 'groups_m2', 'groups_m3',
    'r32', 'r16', 'qf', 'sf', 'final_phase'
  ));

-- Update phase_submissions match count constraint
ALTER TABLE phase_submissions DROP CONSTRAINT IF EXISTS ps_matches_count_check;
ALTER TABLE phase_submissions
  ADD CONSTRAINT ps_matches_count_check CHECK (
    (phase = 'groups_m1' AND matches_in_phase = 24) OR
    (phase = 'groups_m2' AND matches_in_phase = 24) OR
    (phase = 'groups_m3' AND matches_in_phase = 24) OR
    (phase = 'r32' AND matches_in_phase = 16) OR
    (phase = 'r16' AND matches_in_phase = 8) OR
    (phase = 'qf' AND matches_in_phase = 4) OR
    (phase = 'sf' AND matches_in_phase = 2) OR
    (phase = 'final_phase' AND matches_in_phase = 2)
  );
