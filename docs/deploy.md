# Deploy a producción · copa.brakestation.com.mx

Responsable: Eduardo. Ya está listo: DNS (A → 62.146.225.187, proxied en Cloudflare), widget Turnstile "SGI Secure" con el hostname, y la DB `copa_quiniela` con el usuario `copa_user` en `goleadora-postgres`.

## 1. Permisos de la DB (antes del primer deploy)

En Postgres 15+ el esquema `public` ya no es escribible por cualquiera. Si `copa_user` no es dueño, la migración falla y el container no arranca. En la terminal del container `goleadora-postgres` (Coolify):

```sql
psql -U <usuario_root> -d postgres
ALTER DATABASE copa_quiniela OWNER TO copa_user;
\c copa_quiniela
ALTER SCHEMA public OWNER TO copa_user;
GRANT ALL ON SCHEMA public TO copa_user;
\q
```

Si la DB o el usuario no existieran todavía:

```sql
CREATE DATABASE copa_quiniela;
CREATE USER copa_user WITH PASSWORD '<generada>';
```

y luego los comandos de arriba.

## 2. Secretos

Genera cuatro valores distintos (no reuses los del Mundial):

```bash
openssl rand -base64 32   # AUTH_SECRET
openssl rand -hex 32      # SEAL_SECRET   (no cambiarlo durante el torneo)
openssl rand -base64 32   # MAGIC_LINK_SECRET
openssl rand -base64 32   # ADMIN_COOKIE_SECRET
```

## 3. App en Coolify

1. New Resource → Application → repositorio GitHub `musanclickers/brakestation-copa`, rama `main`.
2. Build pack: **Dockerfile**. Dockerfile location: `/Dockerfile` (en la raíz del repo; el build necesita todo el monorepo).
3. Puerto expuesto: `3000`. Health check: `GET /api/health`.
4. Dominio: `https://copa.brakestation.com.mx`.
5. Red: la misma que `goleadora-postgres`, para que resuelva por nombre.

## 4. Variables de entorno (Coolify → Environment Variables)

```
DATABASE_URL=postgres://copa_user:<password>@goleadora-postgres:5432/copa_quiniela
AUTH_SECRET=<generado>
SEAL_SECRET=<generado>
MAGIC_LINK_SECRET=<generado>
ADMIN_COOKIE_SECRET=<generado>
NEXT_PUBLIC_SITE_URL=https://copa.brakestation.com.mx
AUTH_URL=https://copa.brakestation.com.mx
AUTH_TRUST_HOST=true
RESEND_API_KEY=<la del Mundial>
EMAIL_FROM=Copa Brake Station <no-reply@brakestation.com.mx>
TURNSTILE_SITE_KEY=<widget SGI Secure, llave pública>
TURNSTILE_SECRET_KEY=<widget SGI Secure, llave secreta>
ADMIN_EMAILS=comercial@brakestation.com.mx,gerencia@brakestation.com.mx,emurillo@mplabs.com.mx
```

`NEXT_PUBLIC_SITE_URL` se lee en build y en runtime: márcala también como build variable en Coolify. Redis no hace falta (`REDIS_URL` se deja fuera).

## 5. Build + deploy

Deploy. No hay que correr migraciones ni seed a mano: el entrypoint aplica `0000_copa_baseline.sql` y `seed_copa_calendar.sql` en cada arranque (son idempotentes). En el log deberías ver:

```
==> Copa Brake Station · Quiniela: arranque
  -> 0000_copa_baseline.sql
  -> seed_copa_calendar.sql
==> Base de datos lista.
```

Si sale un `ERROR:` y el container se reinicia, casi siempre es el paso 1 (permisos).

## 6. Smoke test post-deploy

1. `curl -I https://copa.brakestation.com.mx` → 200, y `/api/health` → 200.
2. En el celular: "Quiero participar" → correo + nombre + aceptar reglamento. Debe llegar el correo de Resend.
3. Clic al link → entra a "Mi panel". Ve la J1 con los 4 partidos (sáb 17 oct 17:00 y 18:00, dom 18 oct 9:00 y 10:00).
4. Guarda un pronóstico → mensaje de guardado y correo de comprobante. Abre el link "Ver mi comprobante" → "Sello válido".
5. `/admin/login` → "¿Primera vez como admin?" con un correo de `ADMIN_EMAILS` → llega link → crear contraseña → entra a Partidos.
6. En Partidos, captura un marcador falso en un partido y verifica que el ranking cambia. **Bórralo después**: vuelve a capturar el marcador correcto cuando se juegue o limpia con SQL:
   ```sql
   UPDATE matches SET actual_home_score = NULL, actual_away_score = NULL, penalty_winner = NULL WHERE match_code = 'J1-01';
   ```
7. Borra los usuarios de prueba si no deben aparecer en el ranking:
   ```sql
   DELETE FROM match_predictions WHERE user_id IN (SELECT id FROM users WHERE email = '<correo de prueba>');
   DELETE FROM phase_submissions WHERE user_id IN (SELECT id FROM users WHERE email = '<correo de prueba>');
   ```
   (`audit_log` es de solo inserción a propósito; el usuario puede quedarse, sin pronósticos no sale en el ranking.)

## 7. Antes de publicar el link

- [ ] Víctor revisó `/reglamento` y `/privacidad` (son borradores: quitar el subtítulo "Borrador…" y los `TODO(legal)` en `apps/quiniela/src/app/reglamento/page.tsx` y `privacidad/page.tsx`).
- [ ] Premios definidos o se queda "A determinar por el Comité Organizador".
- [ ] Los 3 admins de `ADMIN_EMAILS` ya crearon su contraseña.
- [ ] Prueba completa desde un celular con datos (no Wi-Fi de la oficina).

Si todo pasa, Víctor publica el link en el grupo. Primer cierre: **sábado 17 oct, 16:45 hora Mérida** (J1-01).
