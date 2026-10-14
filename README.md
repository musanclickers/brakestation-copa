# Quiniela Copa Brake Station

Quiniela de la **Copa Brake Station · Primera Edición 2026**, el torneo de 8 equipos cliente de GBS (17 oct – 6 dic 2026). Cualquier persona con correo se registra, pronostica los 32 partidos y compite en un ranking.

Producción: https://copa.brakestation.com.mx

## Reglas que implementa el código

| Regla | Dónde vive |
|---|---|
| 10 pts marcador exacto, 3 pts resultado (ganador o empate), 0 fallo | `apps/quiniela/src/lib/score-match.ts` |
| Cada partido cierra 15 min antes de empezar (server-side) | `LOCKOUT_MINUTES` en `packages/db/src/phases.ts` |
| Pronósticos editables hasta su propio cierre; cada guardado regenera el sello de la jornada | `app/api/phases/[phase]/predictions/submit` |
| Fase Final: sin empates; en penales vale 3 quien eligió al que avanzó | `score-match.ts` + submit route |
| 3er lugar y Gran Final se llenan solos al capturar las semis | `lib/bracket.ts` + `lib/final-phase.ts` |
| Desempate: más exactos → más resultados → último guardado más temprano | `lib/rank-entries.ts` |

Equipos: "Sponsor · Refaccionaria" (BRAKE STATION va sin sponsor). Internamente hay 8 "fases" (`j1`…`j7`, `final`); la UI las agrupa como Fase Regular y Fase Final.

## Stack

- Next.js 14 (App Router, `output: standalone`) · Node 20 · pnpm 10 + Turborepo
- Postgres 16 + Drizzle ORM (el schema se aplica con SQL crudo, ver abajo)
- Auth.js v5 con sesiones en DB; login sin contraseña por **magic link HMAC** propio (`/auth/magic`), que resiste los prefetch de los scanners de correo
- Resend (correo) · Cloudflare Turnstile (registro y login admin)
- Panel admin con contraseña (bcrypt) y cookie HMAC aparte
- Redis: **no se usa**. El rate limit vive en memoria porque corre un solo container.

```
apps/quiniela        la app (participantes + /admin)
packages/db          schema Drizzle, phases (lockout), SQL de migración y seed
packages/auth        Auth.js, magic links, wrapper de emails
packages/seal        sellos HMAC de los comprobantes
packages/ui          logo, formato de hora Mérida, preset de Tailwind
```

## Desarrollo local

Requisitos: Node 20+, pnpm 10 (`corepack enable`), Docker.

```bash
pnpm install
cp .env.example apps/quiniela/.env     # llena los 4 secretos (openssl, ver el archivo)
docker compose up -d                   # Postgres en localhost:5433
pnpm db:migrate                        # aplica drizzle/0*.sql
pnpm db:seed                           # carga los 32 partidos
pnpm dev                               # http://localhost:3000
pnpm test                              # scoring, lockout, bracket, ranking, hora Mérida
```

Sin `TURNSTILE_*` en dev la verificación se omite. Para probar con `next start` (modo producción) usa las llaves de prueba de Cloudflare: `TURNSTILE_SITE_KEY=1x00000000000000000000AA` y `TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000AA`.

Sin `RESEND_API_KEY` válida el registro guarda al usuario pero responde "no pudimos mandar el correo". Para entrar en local sin correo, un admin puede generar el link en `/admin/links`.

### Migraciones

No se usa `drizzle-kit migrate`. Los archivos de `packages/db/drizzle/` son SQL idempotente:

- `0000_copa_baseline.sql`: schema completo (`CREATE ... IF NOT EXISTS`)
- `seed_copa_calendar.sql`: los 32 partidos (`ON CONFLICT (match_code) DO NOTHING`)

En producción `apps/quiniela/scripts/entrypoint.sh` los aplica en cada arranque con `ON_ERROR_STOP=1`; si uno falla el container no levanta. Para cambiar el schema: edita `schema.ts` **y** agrega un `0001_*.sql` idempotente.

## Variables de entorno

Todas están documentadas en [`.env.example`](.env.example).

| Variable | Para qué | Cómo generarla |
|---|---|---|
| `DATABASE_URL` | Postgres `copa_quiniela` | `postgres://copa_user:<pw>@goleadora-postgres:5432/copa_quiniela` |
| `AUTH_SECRET` | Sesiones de Auth.js | `openssl rand -base64 32` |
| `SEAL_SECRET` | Firma de comprobantes. **No cambiar a mitad del torneo** | `openssl rand -hex 32` |
| `MAGIC_LINK_SECRET` | Firma de links de acceso | `openssl rand -base64 32` |
| `ADMIN_COOKIE_SECRET` | Cookie del panel admin | `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL`, `AUTH_URL` | URL pública | `https://copa.brakestation.com.mx` |
| `AUTH_TRUST_HOST` | Auth.js detrás de proxy | `true` |
| `RESEND_API_KEY` | Envío de correo | Se puede reusar la del Mundial |
| `EMAIL_FROM` | Remitente | `Copa Brake Station <no-reply@brakestation.com.mx>` |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | Captcha del widget "SGI Secure" | Cloudflare → Turnstile |
| `ADMIN_EMAILS` | Correos que pueden crear su acceso admin | CSV |
| `REDIS_URL` | Opcional, hoy no se usa | — |

Los cuatro secretos son distintos entre sí y distintos a los del Mundial.

## Admins

**Primer acceso (correos en `ADMIN_EMAILS`):**

1. Entra a `/admin/login` → "¿Primera vez como admin? Crea tu contraseña".
2. Escribe tu correo. Si está en `ADMIN_EMAILS` y todavía no tiene contraseña, llega un link (24 h).
3. El link abre `/admin/change-password`; creas una contraseña de 12+ caracteres. El link deja de servir en cuanto existe la contraseña.

**Más admins:** `/admin/users` → invitar. Llega una contraseña temporal por correo y se cambia al primer login. Sirve también para resetear la contraseña de un admin que la olvidó (re-invitarlo). Otra opción es agregar el correo a `ADMIN_EMAILS` y redeployar.

**Revocar:** `/admin/users` → revocar.

## Operación durante el torneo

- **Cada partido:** `/admin/matches` → capturar marcador. El ranking se recalcula solo.
- **Partido reprogramado:** `/admin/matches` → "Cambiar horario" (hora Mérida). El cierre de pronósticos se mueve con él.
- **Después de J7:** `/admin/phases` (menú "Jornadas") → asignar semifinales (1° vs 4°, 2° vs 3°).
- **Semis:** al capturar los dos marcadores (con ganador de penales si hubo empate) se llenan 3er lugar y Gran Final.
- **Correos masivos:** `/admin/notifications` (manda prueba primero).
- **No le llega el correo a alguien:** `/admin/links` genera su link de acceso.

## Troubleshooting

| Síntoma | Causa probable |
|---|---|
| Container no arranca, log `ERROR:` en un `.sql` | El usuario de DB no tiene permisos sobre `public`. Ver `docs/deploy.md`, paso de GRANT/OWNER |
| Registro dice "No pudimos confirmar que eres humano" | `TURNSTILE_SECRET_KEY` falta o el hostname no está en el widget |
| "No pudimos mandar el correo" | `RESEND_API_KEY` inválida o dominio no verificado en Resend |
| Link de acceso abre `/entrar?error=link_expired` | Pasaron más de 24 h o cambió `MAGIC_LINK_SECRET` |
| Comprobante dice "sello inválido" | El participante cambió su pronóstico después; vale el último correo. Si es masivo: cambió `SEAL_SECRET` |
| POST responde `bad_origin` | El proxy no manda `Host` correcto; revisar que `NEXT_PUBLIC_SITE_URL` coincida con el dominio |

## Roadmap: Segunda Edición 2027

El repo, la URL y la DB no llevan año a propósito. El schema es de un solo torneo; los `TODO(2027 refactor)` en `packages/db/src/schema.ts` y en el baseline SQL describen el cambio:

- Tabla `editions` (`id`, `name`, `slug`, fechas, `status` active/archived) y `edition_id` en `matches`, `match_predictions` y `phase_submissions`, con backfill a la edición 1 ("Primera Edición 2026", slug `2026`).
- Selector de edición activa en el admin; ranking filtrado por edición.
- `copa.brakestation.com.mx` sirve la edición activa; archivo en `/2026`, `/2027`, …
- No renombrar repo, URL ni DB.

Despliegue a producción: ver [`docs/deploy.md`](docs/deploy.md).
