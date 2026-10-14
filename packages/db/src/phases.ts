import { db } from './index';
import { matches, phaseSettings } from './schema';
import { and, eq, isNotNull, sql } from 'drizzle-orm';

export type Phase =
  | 'groups_m1' | 'groups_m2' | 'groups_m3'
  | 'r32' | 'r16' | 'qf' | 'sf' | 'final_phase';

export type GroupsPhase = 'groups_m1' | 'groups_m2' | 'groups_m3';

export function isGroupsPhase(phase: string): phase is GroupsPhase {
  return phase === 'groups_m1' || phase === 'groups_m2' || phase === 'groups_m3';
}

export const PHASE_ORDER: Phase[] = [
  'groups_m1', 'groups_m2', 'groups_m3',
  'r32', 'r16', 'qf', 'sf', 'final_phase',
];

export const PHASE_LABELS: Record<Phase, string> = {
  groups_m1: 'Grupos · Jornada 1',
  groups_m2: 'Grupos · Jornada 2',
  groups_m3: 'Grupos · Jornada 3',
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  final_phase: 'Cierre del Mundial',
};

export const PHASE_LABELS_SHORT: Record<Phase, string> = {
  groups_m1: 'Grupos J1',
  groups_m2: 'Grupos J2',
  groups_m3: 'Grupos J3',
  r32: 'Dieciseisavos',
  r16: 'Octavos',
  qf: 'Cuartos',
  sf: 'Semifinales',
  final_phase: 'Final',
};

export const PHASE_MATCH_COUNTS: Record<Phase, number> = {
  groups_m1: 24, groups_m2: 24, groups_m3: 24,
  r32: 16, r16: 8, qf: 4, sf: 2, final_phase: 2,
};

type PhaseWindow =
  | { opens: Date; closes: Date }
  | { opensAfterPhase: Phase; closes: Date };

const MATCH_DURATION_BUFFER_MS = 2.5 * 60 * 60 * 1000;

export const PHASE_WINDOWS: Record<Phase, PhaseWindow> = {
  // ⚠️ TEMPORAL — groups_m1 opens 2026-05-29 for QA. Revert to 2026-06-01T06:01:00Z before launch.
  groups_m1: { opens: new Date('2026-05-29T00:00:00Z'), closes: new Date('2026-06-12T00:00:00Z') },
  // ⚠️ MANUAL OPEN — groups_m2 y groups_m3 forzadas a abrir 2026-06-16 para que los participantes capturen ya
  // (en lugar de esperar al MAX(starts_at) de la fase anterior + 2.5h).
  groups_m2: { opens: new Date('2026-06-16T00:00:00Z'), closes: new Date('2026-06-19T00:00:00Z') },
  groups_m3: { opens: new Date('2026-06-16T00:00:00Z'), closes: new Date('2026-06-25T00:00:00Z') },
  r32:       { opensAfterPhase: 'groups_m3', closes: new Date('2026-06-29T00:00:00Z') },
  r16:       { opensAfterPhase: 'r32', closes: new Date('2026-07-05T00:00:00Z') },
  qf:        { opensAfterPhase: 'r16', closes: new Date('2026-07-10T00:00:00Z') },
  sf:        { opensAfterPhase: 'qf', closes: new Date('2026-07-15T00:00:00Z') },
  final_phase: { opensAfterPhase: 'sf', closes: new Date('2026-07-19T22:00:00Z') },
};

/** El override admin de la hora de sellado gana sobre el cálculo automático. */
export function resolveOpensAt(override: Date | null | undefined, computed: Date | null): Date | null {
  return override ?? computed;
}

export async function getPhaseSetting(
  phase: Phase,
): Promise<{ previewEnabled: boolean; sealOpensAt: Date | null } | null> {
  const rows = await db
    .select({ previewEnabled: phaseSettings.previewEnabled, sealOpensAt: phaseSettings.sealOpensAt })
    .from(phaseSettings)
    .where(eq(phaseSettings.phase, phase))
    .limit(1);
  return rows[0] ?? null;
}

export async function computeOpensAt(phase: Phase): Promise<Date | null> {
  const setting = await getPhaseSetting(phase);

  const window = PHASE_WINDOWS[phase];
  let computed: Date | null;
  if ('opens' in window) {
    computed = window.opens;
  } else {
    const prevPhase = window.opensAfterPhase;
    const result = await db
      .select({ maxStartsAt: sql<string>`MAX(${matches.startsAt})` })
      .from(matches)
      .where(and(eq(matches.phase, prevPhase), isNotNull(matches.startsAt)));

    const raw = result[0]?.maxStartsAt;
    if (!raw) {
      computed = null;
    } else {
      const lastMatchStart = new Date(raw);
      computed = Number.isNaN(lastMatchStart.getTime())
        ? null
        : new Date(lastMatchStart.getTime() + MATCH_DURATION_BUFFER_MS);
    }
  }

  return resolveOpensAt(setting?.sealOpensAt ?? null, computed);
}

export type PhaseOpenResult = {
  open: boolean;
  reason?: 'before_window' | 'all_matches_started' | 'teams_not_loaded' | 'matches_not_synced';
  opensAt?: Date;
};

export async function isPhaseOpen(phase: Phase, now: Date = new Date()): Promise<PhaseOpenResult> {
  const opensAt = await computeOpensAt(phase);
  if (!opensAt) return { open: false, reason: 'matches_not_synced' };

  if (now < opensAt) return { open: false, reason: 'before_window', opensAt };

  const openMatchRows = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(matches)
    .where(and(
      eq(matches.phase, phase),
      isNotNull(matches.startsAt),
      sql`${matches.startsAt} > NOW()`,
    ));

  if ((openMatchRows[0]?.count ?? 0) === 0) {
    return { open: false, reason: 'all_matches_started' };
  }

  if (!isGroupsPhase(phase)) {
    const incompleteRows = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(matches)
      .where(and(
        eq(matches.phase, phase),
        sql`(${matches.actualHomeTeam} IS NULL OR ${matches.actualAwayTeam} IS NULL)`,
      ));

    if ((incompleteRows[0]?.count ?? 0) > 0) {
      return { open: false, reason: 'teams_not_loaded' };
    }
  }

  return { open: true, opensAt };
}

export type PhasePreviewResult = { previewable: boolean; opensAt: Date | null };

/**
 * Una fase es "previsualizable" (mostrable read-only antes de poder sellar) si el
 * admin activó preview_enabled, la fase aún NO está abierta para sellar, y ya tiene
 * partidos sincronizados que mostrar.
 */
export async function isPhasePreviewable(phase: Phase, now: Date = new Date()): Promise<PhasePreviewResult> {
  const setting = await getPhaseSetting(phase);
  const opensAt = await computeOpensAt(phase);

  if (!setting?.previewEnabled) return { previewable: false, opensAt };

  const open = await isPhaseOpen(phase, now);
  if (open.open) return { previewable: false, opensAt };

  const synced = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(matches)
    .where(eq(matches.phase, phase));

  return { previewable: (synced[0]?.count ?? 0) > 0, opensAt };
}

export async function getCurrentPhase(now: Date = new Date()): Promise<Phase | null> {
  for (const phase of PHASE_ORDER) {
    const result = await isPhaseOpen(phase, now);
    if (result.open) return phase;
  }
  return null;
}

export function nextPhaseAfter(phase: Phase): Phase | null {
  const idx = PHASE_ORDER.indexOf(phase);
  return idx >= 0 && idx < PHASE_ORDER.length - 1 ? PHASE_ORDER[idx + 1] ?? null : null;
}
