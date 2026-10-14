-- Rename end_customer columns to participant (now mandatory for ALL participants)
ALTER TABLE ticket_registrations
  RENAME COLUMN end_customer_name TO participant_name;
ALTER TABLE ticket_registrations
  RENAME COLUMN end_customer_phone TO participant_phone;

-- Backfill nulls before adding NOT NULL constraint
UPDATE ticket_registrations
  SET participant_name = '(sin nombre)'
  WHERE participant_name IS NULL;
UPDATE ticket_registrations
  SET participant_phone = '(sin teléfono)'
  WHERE participant_phone IS NULL;

ALTER TABLE ticket_registrations
  ALTER COLUMN participant_name SET NOT NULL,
  ALTER COLUMN participant_phone SET NOT NULL;

-- Drop old check constraints that enforced client_id/client_text coupling
ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_client_logic_check;
ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_end_customer_check;

-- New rule: trabajador_cliente and cliente_de_cliente must have client_text.
-- client_id stays nullable — admin sets it during review.
ALTER TABLE ticket_registrations
  ADD CONSTRAINT tr_client_text_check CHECK (
    affiliation_type = 'cliente_directo'
    OR client_text IS NOT NULL
  );

-- Index for admin: find registrations pending client normalization
CREATE INDEX IF NOT EXISTS tr_unattributed_idx
  ON ticket_registrations(review_status)
  WHERE client_id IS NULL AND client_text IS NOT NULL;
