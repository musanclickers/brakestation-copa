-- Overrides admin por fase: revelar preview y fijar la hora de apertura del sellado.
-- Sin fila para una fase => comportamiento por defecto (cálculo +2.5h sobre la fase previa).
CREATE TABLE IF NOT EXISTS phase_settings (
  phase           TEXT PRIMARY KEY
                  CHECK (phase IN ('groups_m1','groups_m2','groups_m3','r32','r16','qf','sf','final_phase')),
  preview_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  seal_opens_at   TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
