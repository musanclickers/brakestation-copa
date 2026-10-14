// ponytail: one-off — desglose de puntos de un usuario por email.
// Uso: tsx sql-utils/user-points.ts <email>
import 'dotenv/config';
import { db } from '../src/index';
import { users, tickets } from '../src/schema';
import { eq } from 'drizzle-orm';
import { computeRanking } from '../../../apps/quiniela/src/lib/compute-ranking';

const email = process.argv[2];
if (!email) throw new Error('falta email');

const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email));
if (!u) { console.log(`No existe usuario con email ${email}`); process.exit(0); }

const [t] = await db.select({ type: tickets.type, code: tickets.code }).from(tickets).where(eq(tickets.assignedUserId, u.id));
const cohort = t?.type === 'INT' ? 'int' : 'public';

const ranked = await computeRanking(cohort as 'public' | 'int');
const idx = ranked.findIndex((r) => r.userId === u.id);
const row = ranked[idx];

console.log(`Usuario: ${u.name} <${email}>  folio: ${t?.code ?? '—'} (${t?.type ?? 'sin ticket'})`);
if (!row) {
  console.log('No aparece en el ranking (sin fase sellada o registro no aprobado). 0 puntos contabilizados.');
} else {
  console.log(`Partidos:  ${row.matchPoints}`);
  console.log(`Trivias:   ${row.triviaPoints}`);
  console.log(`Bono:      ${row.bonusPoints}`);
  console.log(`TOTAL:     ${row.totalPoints}`);
  console.log(`Lugar:     ${idx + 1} de ${ranked.length} (cohorte ${cohort})`);
}
process.exit(0);
