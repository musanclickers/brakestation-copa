-- Copa Brake Station · Primera Edición 2026 · schema baseline.
-- Idempotente: el entrypoint lo corre en cada arranque del container.
-- Fuente de verdad en TS: packages/db/src/schema.ts (mantener ambos en sync).
--
-- TODO(2027 refactor Primera → Segunda Edición):
-- Agregar columna edition_id INTEGER NOT NULL REFERENCES editions(id).
-- Nueva tabla editions:
--   editions (id SERIAL PK, name VARCHAR, slug VARCHAR UNIQUE, start_date DATE, end_date DATE, status VARCHAR CHECK IN ('active', 'archived'), created_at TIMESTAMP)
-- Insertar edition "Primera Edición 2026" (slug="2026") y backfill matches/predictions/phases con edition_id=1.
-- Admin UI gana selector de edición activa en header.
-- Ranking filtra por edition_id.
-- URL copa.brakestation.com.mx sirve edición activa; archivo accesible en /2026, /2027, etc.
-- NO renombrar repo, URL ni DB.

-- Usuarios (participantes y admins) + tablas de Auth.js v5
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  email_verified timestamptz,
  name text,
  image text,
  terms_accepted_at timestamptz,
  registration_ip text,
  is_admin boolean NOT NULL DEFAULT false,
  admin_password_hash text,
  must_change_password boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type text NOT NULL,
  provider text NOT NULL,
  provider_account_id text NOT NULL,
  refresh_token text,
  access_token text,
  expires_at integer,
  token_type text,
  scope text,
  id_token text,
  session_state text,
  PRIMARY KEY (provider, provider_account_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  session_token text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification_tokens (
  identifier text NOT NULL,
  token text NOT NULL,
  expires timestamptz NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Partidos: 28 de fase regular (j1-j7) + 4 de fase final.
-- TODO(2027 refactor): edition_id (ver cabecera).
CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_code text NOT NULL UNIQUE,
  phase text NOT NULL CONSTRAINT matches_phase_check CHECK (phase IN ('j1','j2','j3','j4','j5','j6','j7','final')),
  starts_at timestamptz NOT NULL,
  sponsor_home varchar(100),
  refaccionaria_home varchar(100),
  sponsor_away varchar(100),
  refaccionaria_away varchar(100),
  display_label varchar(100),
  actual_home_score integer,
  actual_away_score integer,
  penalty_winner text CONSTRAINT matches_penalty_winner_check CHECK (penalty_winner IN ('home','away') OR penalty_winner IS NULL)
);
CREATE INDEX IF NOT EXISTS matches_phase_idx ON matches (phase);
CREATE INDEX IF NOT EXISTS matches_starts_at_idx ON matches (starts_at);

-- Predicciones: una por usuario+partido, editable hasta 15 min antes del partido.
-- TODO(2027 refactor): edition_id (ver cabecera).
CREATE TABLE IF NOT EXISTS match_predictions (
  user_id uuid NOT NULL REFERENCES users(id),
  match_id uuid NOT NULL REFERENCES matches(id),
  predicted_home_score integer NOT NULL CONSTRAINT mp_home_score_range CHECK (predicted_home_score >= 0 AND predicted_home_score <= 20),
  predicted_away_score integer NOT NULL CONSTRAINT mp_away_score_range CHECK (predicted_away_score >= 0 AND predicted_away_score <= 20),
  seal text NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, match_id)
);
CREATE INDEX IF NOT EXISTS mp_match_idx ON match_predictions (match_id);

-- Sello por jornada (comprobante). Se regenera en cada guardado.
-- TODO(2027 refactor): edition_id (ver cabecera).
CREATE TABLE IF NOT EXISTS phase_submissions (
  user_id uuid NOT NULL REFERENCES users(id),
  phase text NOT NULL CONSTRAINT ps_phase_check CHECK (phase IN ('j1','j2','j3','j4','j5','j6','j7','final')),
  matches_in_phase integer NOT NULL,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  phase_seal text NOT NULL,
  PRIMARY KEY (user_id, phase)
);
CREATE INDEX IF NOT EXISTS ps_seal_idx ON phase_submissions (phase_seal);

-- Bitácora de participantes (INSERT-only)
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES users(id),
  payload jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION prevent_audit_log_modification()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_log es inmutable: no se permite UPDATE ni DELETE';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER audit_log_no_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

CREATE OR REPLACE TRIGGER audit_log_no_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_modification();

-- Bitácora de acciones admin
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES users(id),
  action text NOT NULL,
  target_table text NOT NULL,
  target_id text NOT NULL,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auditoría de envíos masivos de email
CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sent_by uuid NOT NULL REFERENCES users(id),
  template_key text NOT NULL,
  audience_spec jsonb NOT NULL,
  recipient_count integer NOT NULL,
  succeeded_count integer NOT NULL DEFAULT 0,
  failed_count integer NOT NULL DEFAULT 0,
  is_test boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_notification_logs_template_started ON notification_logs (template_key, started_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_by ON notification_logs (sent_by, started_at);
