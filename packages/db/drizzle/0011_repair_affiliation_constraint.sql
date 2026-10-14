-- Repair: migrations 0004/0007 failed partially in prod.
-- This is defensive — drops both possible constraint names.

ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS ticket_registrations_affiliation_type_check;

ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_affiliation_check;

DELETE FROM ticket_registrations
  WHERE affiliation_type NOT IN ('negocio', 'consumidor');

ALTER TABLE ticket_registrations
  ADD CONSTRAINT ticket_registrations_affiliation_type_check
  CHECK (affiliation_type IN ('negocio', 'consumidor'));

UPDATE ticket_registrations
  SET client_text = '(sin nombre)'
  WHERE client_text IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_registrations'
      AND column_name = 'client_text'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE ticket_registrations ALTER COLUMN client_text SET NOT NULL;
  END IF;
END $$;

-- Also repair participant columns if 0004 failed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_registrations'
      AND column_name = 'end_customer_name'
  ) THEN
    ALTER TABLE ticket_registrations RENAME COLUMN end_customer_name TO participant_name;
    ALTER TABLE ticket_registrations RENAME COLUMN end_customer_phone TO participant_phone;
  END IF;
END $$;

UPDATE ticket_registrations SET participant_name = '(sin nombre)' WHERE participant_name IS NULL;
UPDATE ticket_registrations SET participant_phone = '(sin teléfono)' WHERE participant_phone IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ticket_registrations'
      AND column_name = 'participant_name'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE ticket_registrations ALTER COLUMN participant_name SET NOT NULL;
    ALTER TABLE ticket_registrations ALTER COLUMN participant_phone SET NOT NULL;
  END IF;
END $$;

-- Drop old check constraints that may still exist from earlier migrations
ALTER TABLE ticket_registrations DROP CONSTRAINT IF EXISTS tr_client_logic_check;
ALTER TABLE ticket_registrations DROP CONSTRAINT IF EXISTS tr_end_customer_check;
ALTER TABLE ticket_registrations DROP CONSTRAINT IF EXISTS tr_client_text_check;
ALTER TABLE ticket_registrations DROP CONSTRAINT IF EXISTS ticket_registrations_client_text_check;
