import { db } from '@brakestation/db';
import { phaseSubmissions, matchPredictions } from '@brakestation/db/schema';
import { PHASE_ORDER, PHASE_LABELS, isMatchOpen, isMatchLocked, lockoutAt, type Phase } from '@brakestation/db/phases';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { formatMatchTime, formatCountdown } from '@brakestation/ui/time';
import { BrandHeader } from '@/components/BrandHeader';
import { TeamLabel } from '@/components/TeamLabel';
import { SiteFooter } from '@/components/SiteFooter';
import { getAuthUser } from '@/lib/get-auth-user';
import { computeRanking } from '@/lib/compute-ranking';
import { loadMatches } from '@/lib/matches';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as: impersonateId } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/entrar');
  const asSuffix = user.impersonating && impersonateId ? `&as=${impersonateId}` : '';

  const [allMatches, submissions, preds, ranking] = await Promise.all([
    loadMatches(),
    db.select().from(phaseSubmissions).where(eq(phaseSubmissions.userId, user.id)),
    db.select({ matchId: matchPredictions.matchId }).from(matchPredictions).where(eq(matchPredictions.userId, user.id)),
    computeRanking(),
  ]);

  const predicted = new Set(preds.map((p) => p.matchId));
  const subByPhase = new Map(submissions.map((s) => [s.phase, s]));
  const now = new Date();

  const myIndex = ranking.findIndex((r) => r.userId === user.id);
  const me = myIndex >= 0 ? ranking[myIndex] : null;

  // Próximo partido abierto sin pronóstico: lo que más le importa al usuario.
  const pending = allMatches.filter((m) => isMatchOpen(m, now) && !predicted.has(m.id));
  const nextPending = pending[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <p className="text-[11px] text-white/60 truncate">{user.email}</p>
      </header>

      {user.impersonating && (
        <div className="bg-amber-500/90 text-black text-center text-xs font-bold py-1.5 px-4">
          Vista admin: estás viendo como {user.email}
          <Link href="/admin/ranking" className="ml-3 underline">← Volver al admin</Link>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-12 space-y-6">
        <section className="rounded-3xl bg-white/[0.08] border border-white/[0.15] p-5 sm:p-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-brand-gold">Mis puntos</p>
            <p className="font-display text-5xl text-white leading-none mt-1">{me?.totalPoints ?? 0}</p>
            <p className="text-xs text-white/60 mt-2">
              {me ? `${me.exactHits} exactos · ${me.resultHits} resultados` : 'Guarda tu primer pronóstico para entrar al ranking.'}
            </p>
          </div>
          <div className="text-right">
            {me && (
              <p className="text-sm text-white/80">
                Vas <span className="font-black text-white text-2xl">#{myIndex + 1}</span>
                <span className="block text-white/50 text-xs">de {ranking.length}</span>
              </p>
            )}
            <Link href="/ranking" className="inline-block mt-2 text-xs text-brand-gold underline">Ver ranking</Link>
          </div>
        </section>

        {nextPending && (
          <Link
            href={`/quiniela?phase=${nextPending.phase}${asSuffix}`}
            className="block rounded-3xl bg-gradient-to-r from-brand-red to-[#b5161a] p-5 sm:p-6 shadow-[0_10px_30px_rgba(227,33,37,0.35)] hover:-translate-y-0.5 transition-transform"
          >
            <p className="text-xs uppercase tracking-widest text-white/80">Te falta pronosticar</p>
            <div className="flex items-center gap-3 mt-3 mb-2">
              <div className="flex-1 min-w-0"><TeamLabel sponsor={nextPending.sponsorHome} refaccionaria={nextPending.refaccionariaHome} align="right" size="lg" /></div>
              <span className="text-white/70 text-sm font-black">vs</span>
              <div className="flex-1 min-w-0"><TeamLabel sponsor={nextPending.sponsorAway} refaccionaria={nextPending.refaccionariaAway} align="left" size="lg" /></div>
            </div>
            <p className="text-sm text-white/85 mt-1">
              {formatMatchTime(nextPending.startsAt).short} · {formatMatchTime(nextPending.startsAt).time} h ·{' '}
              {formatCountdown(lockoutAt(nextPending.startsAt).getTime() - now.getTime())} para que cierre
              {pending.length > 1 && ` · y ${pending.length - 1} más`}
            </p>
          </Link>
        )}

        <section>
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-3">Fase Regular</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PHASE_ORDER.filter((p) => p !== 'final').map((p) => renderPhase(p))}
          </div>
          <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mt-6 mb-3">Fase Final</h2>
          <div className="grid gap-3 sm:grid-cols-2">{renderPhase('final')}</div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );

  function renderPhase(phase: Phase) {
    const ms = allMatches.filter((m) => m.phase === phase);
    const done = ms.filter((m) => predicted.has(m.id)).length;
    const open = ms.filter((m) => isMatchOpen(m, now)).length;
    const allLocked = ms.length > 0 && ms.every((m) => isMatchLocked(m.startsAt, now));
    const unassigned = ms.some((m) => m.home === null);
    const first = ms[0] ? formatMatchTime(ms[0].startsAt).short : '';
    const sub = subByPhase.get(phase);
    const status = open > 0 ? (done < ms.length ? 'Abierta' : 'Completa') : allLocked ? 'Cerrada' : unassigned ? 'Equipos por definir' : 'Próxima';

    return (
      <Link
        key={phase}
        href={`/quiniela?phase=${phase}${asSuffix}`}
        className={`block rounded-2xl border p-4 transition-colors ${
          open > 0 && done < ms.length ? 'bg-white/[0.10] border-brand-red/60 hover:bg-white/[0.14]' : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08]'
        }`}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-white">{PHASE_LABELS[phase]}</h3>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${open > 0 && done < ms.length ? 'text-brand-red' : 'text-white/50'}`}>{status}</span>
        </div>
        <p className="text-xs text-white/50 mt-1">Desde el {first}</p>
        <p className="text-sm text-white/80 mt-2">{done}/{ms.length} pronósticos</p>
        {sub && <p className="text-[11px] text-green-300/80 mt-1">Sello {sub.phaseSeal.slice(0, 8)}</p>}
      </Link>
    );
  }
}
