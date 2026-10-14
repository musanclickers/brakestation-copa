ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_sports_fixture_id INTEGER UNIQUE,
  ADD COLUMN IF NOT EXISTS venue_name TEXT,
  ADD COLUMN IF NOT EXISTS venue_city TEXT,
  ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS matches_phase_starts_at_idx ON matches(phase, starts_at);
CREATE INDEX IF NOT EXISTS matches_starts_at_idx ON matches(starts_at) WHERE starts_at IS NOT NULL;
