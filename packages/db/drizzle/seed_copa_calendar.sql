-- Calendario Copa Brake Station · Primera Edición 2026 (32 partidos).
-- Horarios en UTC (Mérida = UTC-6, sin horario de verano). Idempotente.
-- Fase final: equipos null hasta que el admin asigna semifinales tras J7.
INSERT INTO matches (match_code, phase, starts_at, sponsor_home, refaccionaria_home, sponsor_away, refaccionaria_away, display_label)
VALUES
  ('J1-01','j1','2026-10-17T23:00:00.000Z','Cana Brake','Ancona Autopartes','SEIRE','EL FARO · Grupo Automotriz',NULL),
  ('J1-02','j1','2026-10-18T00:00:00.000Z','TVA','Buenavista Autopartes','Platinum','Sustaita Refacciones',NULL),
  ('J1-03','j1','2026-10-18T15:00:00.000Z','Golden Friction','Madero Refaccionarias','Exedy','Clutch y Frenos Chuburná',NULL),
  ('J1-04','j1','2026-10-18T16:00:00.000Z','C.A.R. +','DAF Refacciones',NULL,'BRAKE STATION',NULL),
  ('J2-01','j2','2026-10-24T23:00:00.000Z','Golden Friction','Madero Refaccionarias','C.A.R. +','DAF Refacciones',NULL),
  ('J2-02','j2','2026-10-25T00:00:00.000Z','TVA','Buenavista Autopartes',NULL,'BRAKE STATION',NULL),
  ('J2-03','j2','2026-10-25T15:00:00.000Z','Cana Brake','Ancona Autopartes','Platinum','Sustaita Refacciones',NULL),
  ('J2-04','j2','2026-10-25T16:00:00.000Z','SEIRE','EL FARO · Grupo Automotriz','Exedy','Clutch y Frenos Chuburná',NULL),
  ('J3-01','j3','2026-10-31T23:00:00.000Z','SEIRE','EL FARO · Grupo Automotriz','C.A.R. +','DAF Refacciones',NULL),
  ('J3-02','j3','2026-11-01T00:00:00.000Z','Cana Brake','Ancona Autopartes','Exedy','Clutch y Frenos Chuburná',NULL),
  ('J3-03','j3','2026-11-01T15:00:00.000Z','Platinum','Sustaita Refacciones',NULL,'BRAKE STATION',NULL),
  ('J3-04','j3','2026-11-01T16:00:00.000Z','TVA','Buenavista Autopartes','Golden Friction','Madero Refaccionarias',NULL),
  ('J4-01','j4','2026-11-07T23:00:00.000Z','Platinum','Sustaita Refacciones','Golden Friction','Madero Refaccionarias',NULL),
  ('J4-02','j4','2026-11-08T00:00:00.000Z','Exedy','Clutch y Frenos Chuburná','C.A.R. +','DAF Refacciones',NULL),
  ('J4-03','j4','2026-11-08T15:00:00.000Z','Cana Brake','Ancona Autopartes',NULL,'BRAKE STATION',NULL),
  ('J4-04','j4','2026-11-08T16:00:00.000Z','SEIRE','EL FARO · Grupo Automotriz','TVA','Buenavista Autopartes',NULL),
  ('J5-01','j5','2026-11-14T23:00:00.000Z','Cana Brake','Ancona Autopartes','C.A.R. +','DAF Refacciones',NULL),
  ('J5-02','j5','2026-11-15T00:00:00.000Z',NULL,'BRAKE STATION','Golden Friction','Madero Refaccionarias',NULL),
  ('J5-03','j5','2026-11-15T15:00:00.000Z','Exedy','Clutch y Frenos Chuburná','TVA','Buenavista Autopartes',NULL),
  ('J5-04','j5','2026-11-15T16:00:00.000Z','Platinum','Sustaita Refacciones','SEIRE','EL FARO · Grupo Automotriz',NULL),
  ('J6-01','j6','2026-11-21T23:00:00.000Z',NULL,'BRAKE STATION','SEIRE','EL FARO · Grupo Automotriz',NULL),
  ('J6-02','j6','2026-11-22T00:00:00.000Z','Exedy','Clutch y Frenos Chuburná','Platinum','Sustaita Refacciones',NULL),
  ('J6-03','j6','2026-11-22T15:00:00.000Z','Cana Brake','Ancona Autopartes','Golden Friction','Madero Refaccionarias',NULL),
  ('J6-04','j6','2026-11-22T16:00:00.000Z','C.A.R. +','DAF Refacciones','TVA','Buenavista Autopartes',NULL),
  ('J7-01','j7','2026-11-28T23:00:00.000Z','Cana Brake','Ancona Autopartes','TVA','Buenavista Autopartes',NULL),
  ('J7-02','j7','2026-11-29T00:00:00.000Z','Golden Friction','Madero Refaccionarias','SEIRE','EL FARO · Grupo Automotriz',NULL),
  ('J7-03','j7','2026-11-29T15:00:00.000Z','C.A.R. +','DAF Refacciones','Platinum','Sustaita Refacciones',NULL),
  ('J7-04','j7','2026-11-29T16:00:00.000Z',NULL,'BRAKE STATION','Exedy','Clutch y Frenos Chuburná',NULL),
  ('F-SF1','final','2026-12-05T23:00:00.000Z',NULL,NULL,NULL,NULL,'Semifinal 1 · 1° vs 4°'),
  ('F-SF2','final','2026-12-06T00:00:00.000Z',NULL,NULL,NULL,NULL,'Semifinal 2 · 2° vs 3°'),
  ('F-3ER','final','2026-12-06T15:00:00.000Z',NULL,NULL,NULL,NULL,'Tercer lugar'),
  ('F-FINAL','final','2026-12-06T16:00:00.000Z',NULL,NULL,NULL,NULL,'Gran Final')
ON CONFLICT (match_code) DO NOTHING;
