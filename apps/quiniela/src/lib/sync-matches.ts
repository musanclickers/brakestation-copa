import { fetchWorldCupMatches, type FootballDataMatch } from './football-data';
import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import { eq, sql } from 'drizzle-orm';

function mapStageToPhase(stage: string, matchday: number | null, utcDate: string): string | null {
  switch (stage) {
    case 'GROUP_STAGE':
      if (matchday === 1) return 'groups_m1';
      if (matchday === 2) return 'groups_m2';
      if (matchday === 3) return 'groups_m3';
      // Fallback by date if matchday is null
      const d = new Date(utcDate);
      if (d < new Date('2026-06-18T02:00:00Z')) return 'groups_m1';
      if (d < new Date('2026-06-24T02:00:00Z')) return 'groups_m2';
      return 'groups_m3';
    case 'LAST_32': return 'r32';
    case 'LAST_16': return 'r16';
    case 'QUARTER_FINALS': return 'qf';
    case 'SEMI_FINALS': return 'sf';
    case 'THIRD_PLACE': return 'final_phase';
    case 'FINAL': return 'final_phase';
    default: return null;
  }
}

function mapStageToGroup(group: string | null): string | null {
  if (!group) return null;
  return group.replace('GROUP_', '').charAt(0);
}

function generateMatchCode(phase: string, index: number): string {
  return `WCM-${phase.toUpperCase()}-${String(index + 1).padStart(3, '0')}`;
}

export type SyncResult = {
  fetched: number;
  updated: number;
  inserted: number;
  skipped: number;
  errors: string[];
};

export async function syncMatchesFromFootballData(opts?: { reset?: boolean }): Promise<SyncResult> {
  const apiKey = process.env.FOOTBALL_DATA_KEY;
  if (!apiKey) throw new Error('FOOTBALL_DATA_KEY not configured');

  const fixtures = await fetchWorldCupMatches(apiKey, 2026);
  const result: SyncResult = { fetched: fixtures.length, updated: 0, inserted: 0, skipped: 0, errors: [] };

  if (opts?.reset) {
    await db.delete(matches);
  }

  const phaseCounters: Record<string, number> = {};
  const existingAll = await db.select({ matchCode: matches.matchCode, phase: matches.phase }).from(matches);
  for (const em of existingAll) {
    const m = em.matchCode.match(/-(\d+)$/);
    if (m) {
      const idx = parseInt(m[1]!, 10);
      phaseCounters[em.phase] = Math.max(phaseCounters[em.phase] ?? 0, idx);
    }
  }

  for (const f of fixtures) {
    const phase = mapStageToPhase(f.stage, f.matchday, f.utcDate);
    if (!phase) {
      result.errors.push(`No phase mapping for stage "${f.stage}" (id ${f.id})`);
      result.skipped++;
      continue;
    }

    const existing = await db.query.matches.findFirst({
      where: eq(matches.footballDataMatchId, f.id),
    });

    // Blindaje: NUNCA borrar con null un equipo/marcador ya cargado. Los cruces de
    // eliminatoria (mejores terceros) se resuelven de a poco en football-data, y las
    // ediciones manuales del admin deben sobrevivir a un re-sync. Solo escribimos un
    // campo cuando football-data trae valor; si viene null, conservamos lo existente.
    const updateValues: Partial<typeof matches.$inferInsert> = {
      startsAt: new Date(f.utcDate),
      lastSyncedAt: new Date(),
    };
    if (f.venue != null) updateValues.venueName = f.venue;
    if (f.homeTeam.name != null) updateValues.actualHomeTeam = f.homeTeam.name;
    if (f.awayTeam.name != null) updateValues.actualAwayTeam = f.awayTeam.name;
    if (f.score.fullTime.home != null) updateValues.actualHomeScore = f.score.fullTime.home;
    if (f.score.fullTime.away != null) updateValues.actualAwayScore = f.score.fullTime.away;

    if (existing) {
      await db.update(matches).set(updateValues).where(eq(matches.id, existing.id));
      result.updated++;
    } else {
      phaseCounters[phase] = (phaseCounters[phase] ?? 0) + 1;
      const matchCode = generateMatchCode(phase, phaseCounters[phase] - 1);

      await db.insert(matches).values({
        matchCode,
        phase,
        groupLetter: mapStageToGroup(f.group),
        teamHome: f.homeTeam.name ?? 'TBD',
        teamAway: f.awayTeam.name ?? 'TBD',
        scheduledAt: new Date(f.utcDate),
        footballDataMatchId: f.id,
        venueCountry: null,
        venueStadium: null,
        ...updateValues,
      });
      result.inserted++;
    }
  }

  return result;
}
