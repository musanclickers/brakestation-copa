ALTER TABLE phase_submissions
  DROP CONSTRAINT IF EXISTS ps_phase_check;
ALTER TABLE phase_submissions
  ADD CONSTRAINT ps_phase_check
  CHECK (phase IN ('groups','r32','r16','qf','sf','third','final'));
