ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_affiliation_check;

ALTER TABLE ticket_registrations
  ADD CONSTRAINT tr_affiliation_check
  CHECK (affiliation_type IN ('negocio', 'consumidor'));

ALTER TABLE ticket_registrations
  DROP CONSTRAINT IF EXISTS tr_client_text_check;

ALTER TABLE ticket_registrations
  ALTER COLUMN client_text SET NOT NULL;
