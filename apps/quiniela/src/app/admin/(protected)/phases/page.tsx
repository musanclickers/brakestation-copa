import { db } from '@brakestation/db';
import { matches } from '@brakestation/db/schema';
import {
  PHASE_ORDER, PHASE_LABELS, isPhaseOpen, isPhasePreviewable, getPhaseSetting,
} from '@brakestation/db/phases';
import { eq, sql, isNotNull, and } from 'drizzle-orm';
import { SyncButton } from '../matches/SyncButton';
import { PhaseSettingsForm } from './PhaseSettingsForm';

export const dynamic = 'force-dynamic';

function fmtCdmx(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'medium', timeStyle: 'short' });
}

export default async function AdminPhasesPage() {
  const rows = [];
  for (const phase of PHASE_ORDER) {
    const setting = await getPhaseSetting(phase);
    const open = await isPhaseOpen(phase);
    const preview = await isPhasePreviewable(phase);

    const syncedRow = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(matches)
      .where(eq(matches.phase, phase));
    const teamsRow = await db
      .select({ count: sql<number>`COUNT(*)::int` })
      .from(matches)
      .where(and(eq(matches.phase, phase), isNotNull(matches.actualHomeTeam), isNotNull(matches.actualAwayTeam)));

    const state = open.open ? 'Abierta' : preview.previewable ? 'Preview' : 'Cerrada';
    rows.push({
      phase,
      label: PHASE_LABELS[phase],
      state,
      opensAt: open.opensAt ?? preview.opensAt ?? null,
      synced: syncedRow[0]?.count ?? 0,
      teamsLoaded: teamsRow[0]?.count ?? 0,
      previewEnabled: setting?.previewEnabled ?? false,
      sealOpensAtIso: setting?.sealOpensAt ? setting.sealOpensAt.toISOString() : null,
    });
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl text-white mb-1">Admin — Fases</h1>
          <p className="text-white/80 text-sm">Activa preview y fija la hora de apertura del sellado por fase.</p>
        </div>
        <SyncButton />
      </div>

      <div className="space-y-4">
        {rows.map((r) => (
          <article key={r.phase} className="rounded-2xl bg-white/[0.06] border border-white/10 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-bold text-white">{r.label} <span className="text-white/40 text-xs font-mono">{r.phase}</span></h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80">{r.state}</span>
            </div>
            <p className="text-xs text-white/50 mb-4">
              Apertura calculada: {fmtCdmx(r.opensAt)} · {r.synced} partidos sincronizados · {r.teamsLoaded} con equipos cargados
            </p>
            <PhaseSettingsForm
              phase={r.phase}
              label={r.label}
              initialPreview={r.previewEnabled}
              initialSealOpensAtIso={r.sealOpensAtIso}
            />
          </article>
        ))}
      </div>
    </div>
  );
}
