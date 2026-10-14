import 'dotenv/config';
import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import { asc, inArray } from 'drizzle-orm';

const TARGET_PHASES = ['groups_m1', 'groups_m2', 'groups_m3'] as const;

function fmtDate(d: Date | null | undefined): string {
  if (!d) return 'NULL';
  return d.toISOString().replace('T', ' ').slice(0, 19) + 'Z';
}

function lockStatus(startsAt: Date | null | undefined, now: Date): string {
  if (!startsAt) return 'SIN startsAt';
  return startsAt.getTime() <= now.getTime() ? 'SELLADO' : 'ABIERTO';
}

async function main() {
  const now = new Date();
  const rows = await db
    .select({
      id: matches.id,
      matchCode: matches.matchCode,
      phase: matches.phase,
      teamHome: matches.teamHome,
      teamAway: matches.teamAway,
      scheduledAt: matches.scheduledAt,
      startsAt: matches.startsAt,
    })
    .from(matches)
    .where(inArray(matches.phase, [...TARGET_PHASES]))
    .orderBy(asc(matches.phase), asc(matches.scheduledAt));

  console.log(`Report at: ${now.toISOString()}`);
  console.log(`Total rows: ${rows.length}`);
  console.log('');

  for (const phase of TARGET_PHASES) {
    const phaseRows = rows.filter((r) => r.phase === phase);
    console.log(`── ${phase} (${phaseRows.length}) ─────────────────────────────`);
    console.log('matchCode | teamHome vs teamAway | startsAt | lock');
    for (const r of phaseRows) {
      console.log(
        `${r.matchCode} | ${r.teamHome} vs ${r.teamAway} | ${fmtDate(r.startsAt)} | ${lockStatus(r.startsAt, now)}`,
      );
    }
    console.log('');
  }

  const missing = rows.filter((r) => !r.startsAt);
  if (missing.length > 0) {
    console.warn(`⚠ ${missing.length} matches without startsAt — run /admin/matches → Resincronizar`);
    for (const m of missing) console.warn(`  - ${m.matchCode}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('[report-match-locks] FAILED', e);
    process.exit(1);
  });
