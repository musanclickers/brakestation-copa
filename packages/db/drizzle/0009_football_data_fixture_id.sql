ALTER TABLE matches
  DROP COLUMN IF EXISTS api_sports_fixture_id;

ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS football_data_match_id INTEGER UNIQUE;

CREATE INDEX IF NOT EXISTS matches_football_data_match_id_idx
  ON matches(football_data_match_id);
