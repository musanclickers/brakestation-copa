-- Allow 'INT' as a valid ticket type (Brake Station internal employees)
-- Public folios stay 'BS' (Brake Station retail) and 'CD' (CanaBRAKE Directo)

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_type_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_type_check CHECK (type IN ('BS', 'CD', 'INT'));
