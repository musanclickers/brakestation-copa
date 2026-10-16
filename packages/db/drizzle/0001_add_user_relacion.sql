-- Relación del participante con la Copa (segmentación). Idempotente: el
-- entrypoint re-ejecuta todos los 0*.sql en cada arranque.
-- Nullable a propósito: admins creados por /admin/setup o invite no pasan por
-- el registro. NULL = admin o usuario previo. El requerido lo valida /api/entrar.
-- Valores: deben coincidir con apps/quiniela/src/lib/relacion.ts.
ALTER TABLE users ADD COLUMN IF NOT EXISTS relacion text
  CONSTRAINT users_relacion_check CHECK (relacion IN (
    'familiar_jugador', 'empleado_refaccionaria', 'amigo_jugador',
    'companero_trabajo', 'cliente_refaccionaria', 'otro'
  ));
ALTER TABLE users ADD COLUMN IF NOT EXISTS relacion_detalle varchar(100);

UPDATE users
SET relacion = 'otro', relacion_detalle = 'Administrador de sistema GBS'
WHERE email = 'soporteti@brakestation.com.mx' AND relacion IS NULL;

CREATE INDEX IF NOT EXISTS users_relacion_idx ON users (relacion);
