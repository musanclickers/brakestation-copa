// ponytail: one-off — audita los clusters de trivia que alimentan el scoring.
// Muestra cuántas preguntas DISTINTAS (cluster = phaseLabel+pregunta normalizada)
// existen, cuántas copias raw tiene cada una, y cuántos usuarios acertaron.
// Si dos clusters parecen la misma pregunta, la normalizacion no las fusiona y
// el scoring las cuenta por separado (inflacion).
// Uso: tsx sql-utils/trivia-clusters.ts [emailOpcional]
import 'dotenv/config';
import { db } from '../src/index';
import { trivias, triviaResponses, users, tickets } from '../src/schema';
import { eq } from 'drizzle-orm';

const norm = (q: string) => q.toLowerCase().trim().replace(/\s+/g, ' ');

const allTrivias = await db
  .select({ id: trivias.id, phaseLabel: trivias.phaseLabel, question: trivias.question, correctOption: trivias.correctOption, opensAt: trivias.opensAt })
  .from(trivias);
const allResponses = await db
  .select({ userId: triviaResponses.userId, triviaId: triviaResponses.triviaId, selectedOption: triviaResponses.selectedOption })
  .from(triviaResponses);

// index por triviaId -> cluster + correct
const idx = new Map<string, { cluster: string; correct: string }>();
const clusterMeta = new Map<string, { phase: string; question: string; ids: string[] }>();
for (const t of allTrivias) {
  const cluster = `${t.phaseLabel}|${norm(t.question)}`;
  idx.set(t.id, { cluster, correct: t.correctOption });
  const m = clusterMeta.get(cluster) ?? { phase: t.phaseLabel, question: t.question, ids: [] };
  m.ids.push(t.id);
  clusterMeta.set(cluster, m);
}

// usuarios correctos por cluster
const correctUsersByCluster = new Map<string, Set<string>>();
for (const r of allResponses) {
  const info = idx.get(r.triviaId);
  if (!info || r.selectedOption !== info.correct) continue;
  let s = correctUsersByCluster.get(info.cluster);
  if (!s) { s = new Set(); correctUsersByCluster.set(info.cluster, s); }
  s.add(r.userId);
}

console.log(`\nTRIVIAS raw: ${allTrivias.length}   CLUSTERS distintos: ${clusterMeta.size}\n`);
console.log('Cada cluster = 2 pts. Max trivia points posible = ' + clusterMeta.size * 2 + '\n');
const rows = [...clusterMeta.entries()].sort((a, b) => a[1].phase.localeCompare(b[1].phase));
for (const [cluster, m] of rows) {
  const correctos = correctUsersByCluster.get(cluster)?.size ?? 0;
  console.log(`[${m.phase}] copias=${m.ids.length} acertaron=${correctos}  "${m.question.slice(0, 60)}"`);
}

// desglose de un usuario opcional
const email = process.argv[2];
if (email) {
  const [u] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.email, email));
  if (!u) { console.log(`\nNo existe ${email}`); process.exit(0); }
  const [t] = await db.select({ code: tickets.code }).from(tickets).where(eq(tickets.assignedUserId, u.id));
  const credited = new Set<string>();
  let pts = 0;
  const detail: string[] = [];
  for (const r of allResponses) {
    if (r.userId !== u.id) continue;
    const info = idx.get(r.triviaId);
    if (!info || r.selectedOption !== info.correct) continue;
    if (credited.has(info.cluster)) continue;
    credited.add(info.cluster);
    pts += 2;
    const m = clusterMeta.get(info.cluster)!;
    detail.push(`  +2 [${m.phase}] "${m.question.slice(0, 60)}"`);
  }
  console.log(`\n=== ${u.name} <${email}> folio ${t?.code ?? '—'} ===`);
  console.log(`Trivia points: ${pts} (${credited.size} preguntas)`);
  detail.forEach((d) => console.log(d));
}
process.exit(0);
