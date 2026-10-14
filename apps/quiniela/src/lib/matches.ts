import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import { homeName, awayName, type Phase } from '@brakestation/db/phases';
import { asc } from 'drizzle-orm';

// Forma serializable (server → client) de un partido, con nombres ya resueltos.
export type SerializedMatch = {
  id: string;
  matchCode: string;
  phase: Phase;
  startsAt: string;
  home: string | null; // null = por definir (fase final)
  away: string | null;
  sponsorHome: string | null;
  refaccionariaHome: string | null;
  sponsorAway: string | null;
  refaccionariaAway: string | null;
  displayLabel: string | null;
  actualHomeScore: number | null;
  actualAwayScore: number | null;
  penaltyWinner: 'home' | 'away' | null;
};

export function serializeMatch(m: typeof matches.$inferSelect): SerializedMatch {
  return {
    id: m.id,
    matchCode: m.matchCode,
    phase: m.phase as Phase,
    startsAt: m.startsAt.toISOString(),
    home: homeName(m),
    away: awayName(m),
    sponsorHome: m.sponsorHome,
    refaccionariaHome: m.refaccionariaHome,
    sponsorAway: m.sponsorAway,
    refaccionariaAway: m.refaccionariaAway,
    displayLabel: m.displayLabel,
    actualHomeScore: m.actualHomeScore,
    actualAwayScore: m.actualAwayScore,
    penaltyWinner: m.penaltyWinner as 'home' | 'away' | null,
  };
}

export async function loadMatches(): Promise<SerializedMatch[]> {
  const rows = await db.select().from(matches).orderBy(asc(matches.startsAt));
  return rows.map(serializeMatch);
}

export function hasResult(m: Pick<SerializedMatch, 'actualHomeScore' | 'actualAwayScore'>): boolean {
  return m.actualHomeScore != null && m.actualAwayScore != null;
}
