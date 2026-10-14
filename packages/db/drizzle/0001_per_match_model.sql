-- Migration 0001: Per-match prediction model
-- Drop old predictions table, create matches + match_predictions + prediction_submissions

DROP TABLE IF EXISTS "predictions" CASCADE;

CREATE TABLE "matches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "match_code" text UNIQUE NOT NULL,
  "phase" text NOT NULL,
  "group_letter" text,
  "team_home" text NOT NULL,
  "team_away" text NOT NULL,
  "scheduled_at" timestamp with time zone NOT NULL,
  "venue_country" text,
  "venue_stadium" text,
  "actual_home_team" text,
  "actual_away_team" text,
  "actual_home_score" integer,
  "actual_away_score" integer,
  CONSTRAINT "matches_phase_check" CHECK ("phase" IN ('groups','r32','r16','qf','sf','third','final')),
  CONSTRAINT "matches_venue_check" CHECK ("venue_country" IN ('MX','US','CA') OR "venue_country" IS NULL)
);

CREATE INDEX "matches_phase_idx" ON "matches" ("phase");
CREATE INDEX "matches_scheduled_at_idx" ON "matches" ("scheduled_at");

CREATE TABLE "match_predictions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "ticket_code" text NOT NULL REFERENCES "tickets"("code"),
  "match_id" uuid NOT NULL REFERENCES "matches"("id"),
  "predicted_home_team" text NOT NULL,
  "predicted_away_team" text NOT NULL,
  "predicted_home_score" integer NOT NULL,
  "predicted_away_score" integer NOT NULL,
  "seal" text NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "mp_home_score_range" CHECK ("predicted_home_score" >= 0 AND "predicted_home_score" <= 20),
  CONSTRAINT "mp_away_score_range" CHECK ("predicted_away_score" >= 0 AND "predicted_away_score" <= 20),
  CONSTRAINT "mp_window" CHECK ("submitted_at" >= '2026-06-01 00:00:00-06'::timestamptz AND "submitted_at" <= '2026-06-10 23:59:59-06'::timestamptz)
);

CREATE UNIQUE INDEX "mp_user_ticket_match_unique" ON "match_predictions" ("user_id", "ticket_code", "match_id");
CREATE INDEX "mp_user_idx" ON "match_predictions" ("user_id");
CREATE INDEX "mp_ticket_idx" ON "match_predictions" ("ticket_code");

CREATE TABLE "prediction_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id"),
  "ticket_code" text NOT NULL UNIQUE REFERENCES "tickets"("code"),
  "total_matches_predicted" integer NOT NULL,
  "submitted_at" timestamp with time zone NOT NULL DEFAULT now(),
  "global_seal" text NOT NULL,
  CONSTRAINT "ps_total_check" CHECK ("total_matches_predicted" = 104),
  CONSTRAINT "ps_window" CHECK ("submitted_at" >= '2026-06-01 00:00:00-06'::timestamptz AND "submitted_at" <= '2026-06-10 23:59:59-06'::timestamptz)
);

CREATE INDEX "ps_user_idx" ON "prediction_submissions" ("user_id");
CREATE INDEX "ps_global_seal_idx" ON "prediction_submissions" ("global_seal");
