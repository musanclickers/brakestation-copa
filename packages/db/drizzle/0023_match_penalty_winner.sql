-- Eliminatoria: marca si un partido se definió en penales y qué lado avanzó.
-- null = decidido en tiempo regular/extra (scoring normal: 5 exacto / 2 resultado).
-- 'home'/'away' = fue a penales; solo se otorgan 2 pts a quien predijo al equipo que avanzó.
ALTER TABLE matches ADD COLUMN IF NOT EXISTS penalty_winner TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'matches_penalty_winner_check'
  ) THEN
    ALTER TABLE matches ADD CONSTRAINT matches_penalty_winner_check
      CHECK (penalty_winner IN ('home','away') OR penalty_winner IS NULL);
  END IF;
END $$;
