-- Insert 20 new INT folios (Brake Station internal employees, 2026-06-11)
-- Run AFTER 0019_int_ticket_type.sql which allows type=INT.

BEGIN;

INSERT INTO tickets (code, type, source_branch) VALUES
  ('INT-X294', 'INT', NULL),
  ('INT-P731', 'INT', NULL),
  ('INT-H450', 'INT', NULL),
  ('INT-L621', 'INT', NULL),
  ('INT-G115', 'INT', NULL),
  ('INT-E703', 'INT', NULL),
  ('INT-K138', 'INT', NULL),
  ('INT-M384', 'INT', NULL),
  ('INT-R107', 'INT', NULL),
  ('INT-V763', 'INT', NULL),
  ('INT-J801', 'INT', NULL),
  ('INT-S149', 'INT', NULL),
  ('INT-O395', 'INT', NULL),
  ('INT-F403', 'INT', NULL),
  ('INT-W710', 'INT', NULL),
  ('INT-C612', 'INT', NULL),
  ('INT-T892', 'INT', NULL),
  ('INT-D218', 'INT', NULL),
  ('INT-Z354', 'INT', NULL),
  ('INT-X129', 'INT', NULL)
ON CONFLICT (code) DO NOTHING;

SELECT type, COUNT(*) FROM tickets GROUP BY type ORDER BY type;
SELECT code FROM tickets WHERE type = 'INT' ORDER BY code;

COMMIT;