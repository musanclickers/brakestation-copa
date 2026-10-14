// One-off DELIBERADO: sella una fase a nombre de un participante que mandó sus
// resultados pero no alcanzó a sellar antes del lock. Genera los MISMOS seals HMAC
// que el submit route, saltándose el candado de kickoff. Es un script manual a
// propósito (sellar tras el lock rompe integridad; debe ser consciente).
//
// Autocontenido: node + el paquete `postgres` (dep de la app, se localiza con
// find porque en pnpm está anidado) + env DATABASE_URL y SEAL_SECRET. Correr en
// el contenedor de la APP:
//   PG_PKG=$(find / -path '*/node_modules/postgres/package.json' 2>/dev/null | head -1) \
//     node seal.mjs
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const PG_PKG = process.env.PG_PKG;
if (!PG_PKG) throw new Error("falta PG_PKG (ruta a .../node_modules/postgres/package.json)");
const postgres = createRequire(PG_PKG)('postgres');

// ─── CONFIG ───────────────────────────────────────────────────────────────
const EMAIL = 'dibenev@hotmail.com';
const PHASE = 'sf';
// Goles por selección (nombres EXACTOS como están en la DB, en inglés). El script
// mapea a home/away de cada partido sin importar de qué lado esté cada equipo.
const SCORES_BY_TEAM = {
  France: 2, Spain: 1,      // Francia 2 - 1 España
  England: 1, Argentina: 2, // Inglaterra 1 - 2 Argentina
};
// ──────────────────────────────────────────────────────────────────────────

const SEAL_SECRET = process.env.SEAL_SECRET;
const DATABASE_URL = process.env.DATABASE_URL;
if (!SEAL_SECRET) throw new Error('falta SEAL_SECRET en el entorno');
if (!DATABASE_URL) throw new Error('falta DATABASE_URL en el entorno');

// mismo canonicalize/seal que packages/seal (sort keys deep + JSON + hmac sha256)
function sortKeysDeep(o) {
  if (o === null || typeof o !== 'object') return o;
  if (Array.isArray(o)) return o.map(sortKeysDeep);
  const out = {};
  for (const k of Object.keys(o).sort()) out[k] = sortKeysDeep(o[k]);
  return out;
}
const seal = (payload) =>
  crypto.createHmac('sha256', SEAL_SECRET).update(JSON.stringify(sortKeysDeep(payload))).digest('hex');
const phaseSealOf = (phase, picks) => {
  const sorted = [...picks].sort((a, b) => a.match_code.localeCompare(b.match_code));
  return seal({ v: '1.0', type: 'phase_submission', phase, count: sorted.length, picks: sorted });
};

const sql = postgres(DATABASE_URL);

try {
  const [u] = await sql`SELECT id FROM users WHERE email = ${EMAIL}`;
  if (!u) throw new Error(`no existe usuario ${EMAIL}`);
  const [t] = await sql`SELECT code FROM tickets WHERE assigned_user_id = ${u.id} LIMIT 1`;
  if (!t) throw new Error(`el usuario ${EMAIL} no tiene boleto asignado`);

  const [dup] = await sql`
    SELECT 1 FROM phase_submissions
    WHERE user_id = ${u.id} AND ticket_code = ${t.code} AND phase = ${PHASE}`;
  if (dup) throw new Error(`ya está sellada la fase ${PHASE} para ${EMAIL}; no se toca`);

  const rows = await sql`
    SELECT id, match_code,
           COALESCE(actual_home_team, team_home) AS home,
           COALESCE(actual_away_team, team_away) AS away
    FROM matches WHERE phase = ${PHASE}`;
  if (rows.length === 0) throw new Error(`no hay partidos en la fase ${PHASE}`);

  const picks = [];
  for (const m of rows) {
    const h = SCORES_BY_TEAM[m.home];
    const a = SCORES_BY_TEAM[m.away];
    if (h === undefined || a === undefined) {
      throw new Error(`falta marcador para ${m.match_code} (${m.home} vs ${m.away}); revisa SCORES_BY_TEAM`);
    }
    picks.push({ matchId: m.id, match_code: m.match_code, h, a });
  }

  console.log(`Sellando ${PHASE} para ${EMAIL} (boleto ${t.code}):`);
  picks.forEach((p) => console.log(`  ${p.match_code}: ${p.h}-${p.a}`));

  const submittedAt = new Date();
  await sql.begin(async (tx) => {
    for (const p of picks) {
      const mpSeal = seal({
        v: '1.0', type: 'match_prediction', ticket_code: t.code, match_code: p.match_code,
        user_id: u.id, data: { home_score: p.h, away_score: p.a },
      });
      await tx`
        INSERT INTO match_predictions
          (user_id, ticket_code, match_id, predicted_home_score, predicted_away_score, seal, submitted_at)
        VALUES (${u.id}, ${t.code}, ${p.matchId}, ${p.h}, ${p.a}, ${mpSeal}, ${submittedAt})
        ON CONFLICT (user_id, ticket_code, match_id)
        DO UPDATE SET predicted_home_score = ${p.h}, predicted_away_score = ${p.a},
                      seal = ${mpSeal}, submitted_at = ${submittedAt}`;
    }
    const phaseSeal = phaseSealOf(PHASE, picks);
    await tx`
      INSERT INTO phase_submissions
        (user_id, ticket_code, phase, matches_in_phase, submitted_at, phase_seal)
      VALUES (${u.id}, ${t.code}, ${PHASE}, ${picks.length}, ${submittedAt}, ${phaseSeal})`;
    console.log(`\n✓ Fase sellada. phase_seal: ${phaseSeal.slice(0, 8)}…  (${picks.length} partidos)`);
  });
} finally {
  await sql.end();
}
