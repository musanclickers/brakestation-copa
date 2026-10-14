-- Per-match locking: allow partial submissions (fewer predictions than total matches in phase)
-- The old constraint required exact counts (e.g. 24 for groups). Now users who register
-- late may not be able to predict already-started matches.
ALTER TABLE phase_submissions DROP CONSTRAINT IF EXISTS ps_matches_count_check;
