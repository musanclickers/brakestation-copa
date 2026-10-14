import { db } from '@brakestation/db';
import { matches, adminActions } from '@brakestation/db/schema';
import { isMatchLocked } from '@brakestation/db/phases';
import { eq, inArray } from 'drizzle-orm';
import { finalPairings, type Team } from './bracket';

export const FINAL_CODES = { sf1: 'F-SF1', sf2: 'F-SF2', tercer: 'F-3ER', final: 'F-FINAL' } as const;

const teamCols = (home: Team, away: Team) => ({
  sponsorHome: home.sponsor,
  refaccionariaHome: home.refaccionaria,
  sponsorAway: away.sponsor,
  refaccionariaAway: away.refaccionaria,
});

/**
 * Llena 3er lugar y Gran Final con los resultados de las semis. Se llama cada
 * vez que el admin captura/corrige un marcador de semifinal. No toca un partido
 * que ya cerró pronósticos (para no cambiar equipos con apuestas cerradas).
 * Devuelve qué partidos actualizó.
 */
export async function populateFinals(adminId: string): Promise<string[]> {
  const rows = await db.select().from(matches).where(inArray(matches.matchCode, Object.values(FINAL_CODES)));
  const by = new Map(rows.map((r) => [r.matchCode, r]));
  const sf1 = by.get(FINAL_CODES.sf1);
  const sf2 = by.get(FINAL_CODES.sf2);
  if (!sf1 || !sf2) return [];

  const pairs = finalPairings(sf1, sf2);
  if (!pairs) return [];

  const updated: string[] = [];
  for (const [code, [home, away]] of [[FINAL_CODES.tercer, pairs.tercer], [FINAL_CODES.final, pairs.final]] as const) {
    const m = by.get(code);
    if (!m || isMatchLocked(m.startsAt)) continue;
    const next = teamCols(home, away);
    if (m.refaccionariaHome === next.refaccionariaHome && m.refaccionariaAway === next.refaccionariaAway) continue;
    await db.update(matches).set(next).where(eq(matches.id, m.id));
    await db.insert(adminActions).values({
      adminId,
      action: 'auto_populate_final',
      targetTable: 'matches',
      targetId: m.id,
      beforeState: { home: m.refaccionariaHome, away: m.refaccionariaAway },
      afterState: next,
    });
    updated.push(code);
  }
  return updated;
}
