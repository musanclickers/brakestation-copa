import { db } from './index';
import { matches } from './schema';
import { eq } from 'drizzle-orm';

// Copa Brake Station: 7 jornadas de fase regular + fase final.
// Cada jornada es una "fase" interna (un sello por usuario+jornada). La UI las
// agrupa como "Fase Regular" (j1-j7) y "Fase Final" (final).
// TODO(2027 refactor): las fases son por edición; filtrar por edition_id.

export type Phase = 'j1' | 'j2' | 'j3' | 'j4' | 'j5' | 'j6' | 'j7' | 'final';

export const PHASE_ORDER: Phase[] = ['j1', 'j2', 'j3', 'j4', 'j5', 'j6', 'j7', 'final'];

export const PHASE_LABELS: Record<Phase, string> = {
  j1: 'Jornada 1',
  j2: 'Jornada 2',
  j3: 'Jornada 3',
  j4: 'Jornada 4',
  j5: 'Jornada 5',
  j6: 'Jornada 6',
  j7: 'Jornada 7',
  final: 'Fase Final',
};

export const PHASE_LABELS_SHORT: Record<Phase, string> = {
  j1: 'J1', j2: 'J2', j3: 'J3', j4: 'J4', j5: 'J5', j6: 'J6', j7: 'J7', final: 'Final',
};

export function isPhase(x: string): x is Phase {
  return (PHASE_ORDER as string[]).includes(x);
}

export function phaseGroupLabel(phase: Phase): string {
  return phase === 'final' ? 'Fase Final' : 'Fase Regular';
}

// ─── Lockout: por jornada (ver lockout.ts) ──────────────────────

export { LOCKOUT_MINUTES, lockoutAt, isMatchLocked, phaseLockoutAt, isPhaseLocked, teamsAssigned, isMatchOpen } from './lockout';
import { isMatchOpen, isPhaseLocked, teamsAssigned } from './lockout';

// ─── Equipos ────────────────────────────────────────────────────

/** "Sponsor · Refaccionaria", o solo la refaccionaria si no hay sponsor (BRAKE STATION). */
export function teamName(sponsor: string | null | undefined, refaccionaria: string | null | undefined): string | null {
  if (!refaccionaria) return null;
  return sponsor ? `${sponsor} · ${refaccionaria}` : refaccionaria;
}

type MatchTeams = {
  sponsorHome: string | null;
  refaccionariaHome: string | null;
  sponsorAway: string | null;
  refaccionariaAway: string | null;
};

export function homeName(m: MatchTeams): string | null {
  return teamName(m.sponsorHome, m.refaccionariaHome);
}

export function awayName(m: MatchTeams): string | null {
  return teamName(m.sponsorAway, m.refaccionariaAway);
}

// ─── Estado de una jornada ──────────────────────────────────────

export type PhaseOpenResult = {
  open: boolean;
  reason?: 'all_matches_locked' | 'teams_not_loaded';
};

export async function isPhaseOpen(phase: Phase, now: Date = new Date()): Promise<PhaseOpenResult> {
  const rows = await db.select().from(matches).where(eq(matches.phase, phase));
  if (rows.some((m) => isMatchOpen(m, rows, now))) return { open: true };
  if (!isPhaseLocked(rows, now) && rows.some((m) => !teamsAssigned(m))) {
    return { open: false, reason: 'teams_not_loaded' };
  }
  return { open: false, reason: 'all_matches_locked' };
}

/** Primera jornada con al menos un partido abierto (la "jornada actual"). */
export async function getCurrentPhase(now: Date = new Date()): Promise<Phase | null> {
  const rows = await db.select().from(matches);
  for (const phase of PHASE_ORDER) {
    if (rows.some((m) => m.phase === phase && isMatchOpen(m, rows, now))) return phase;
  }
  return null;
}
