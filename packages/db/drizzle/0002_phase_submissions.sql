-- Migration 0002: Phase-based submission model
-- Drop prediction_submissions (replaced by phase_submissions)
-- Simplify match_predictions (remove team columns, window check)

DROP TABLE IF EXISTS "prediction_submissions" CASCADE;

ALTER TABLE "match_predictions" DROP CONSTRAINT IF EXISTS "mp_window";
ALTER TABLE "match_predictions" DROP COLUMN IF EXISTS "predicted_home_team";
ALTER TABLE "match_predictions" DROP COLUMN IF EXISTS "predicted_away_team";

CREATE INDEX IF NOT EXISTS "mp_match_idx" ON "match_predictions" ("match_id");

CREATE TABLE IF NOT EXISTS "phase_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "ticket_code" text NOT NULL REFERENCES "tickets"("code"),
  "phase" text NOT NULL,
  "matches_in_phase" integer NOT NULL,
  "submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
  "phase_seal" text NOT NULL,
  CONSTRAINT "ps_phase_check" CHECK ("phase" IN ('groups','r32','r16','qf','sf','final_phase')),
  CONSTRAINT "ps_matches_count_check" CHECK (
    ("phase" = 'groups' AND "matches_in_phase" = 72) OR
    ("phase" = 'r32' AND "matches_in_phase" = 16) OR
    ("phase" = 'r16' AND "matches_in_phase" = 8) OR
    ("phase" = 'qf' AND "matches_in_phase" = 4) OR
    ("phase" = 'sf' AND "matches_in_phase" = 2) OR
    ("phase" = 'final_phase' AND "matches_in_phase" = 2)
  )
);

CREATE UNIQUE INDEX "ps_user_ticket_phase_unique" ON "phase_submissions" ("user_id", "ticket_code", "phase");
CREATE INDEX "ps_seal_idx" ON "phase_submissions" ("phase_seal");
