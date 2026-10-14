-- 0020_trivias_phase_label.sql
-- Rename trivias.phase_transition (int 1-5) → trivias.phase_label (text, matches.phase enum)
-- Reason: align with matches.phase domain and remove ambiguity about which phase each trivia targets.

ALTER TABLE trivias ADD COLUMN phase_label TEXT;

UPDATE trivias SET phase_label = CASE phase_transition
  WHEN 1 THEN 'groups_m2'
  WHEN 2 THEN 'groups_m3'
  WHEN 3 THEN 'r32'
  WHEN 4 THEN 'r16'
  WHEN 5 THEN 'qf'
  ELSE NULL
END;

ALTER TABLE trivias ALTER COLUMN phase_label SET NOT NULL;

ALTER TABLE trivias DROP CONSTRAINT IF EXISTS trivias_phase_check;
ALTER TABLE trivias ADD CONSTRAINT trivias_phase_label_check CHECK (
  phase_label IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')
);

ALTER TABLE trivias DROP COLUMN phase_transition;
