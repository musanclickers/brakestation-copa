import { db } from '@brakestation/db';
import { phaseSubmissions, matchPredictions, matches, auditLog } from '@brakestation/db/schema';
import { PHASE_LABELS, type Phase } from '@brakestation/db/phases';
import { verifyPhaseSeal } from '@brakestation/seal';
import { eq, and, asc, inArray } from 'drizzle-orm';
import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { getTeamDisplayName } from '@brakestation/ui/teams';
import { SiteFooter } from '@/components/SiteFooter';
import { getFlagUrl } from '@brakestation/ui/flags';
import { scoreMatch, matchResultMeta, type PenaltyWinner } from '@/lib/score-match';

export const dynamic = 'force-dynamic';

function getMatchResult(predH: number, predA: number, actualH: number, actualA: number, penaltyWinner?: PenaltyWinner) {
  return matchResultMeta(scoreMatch(predH, predA, actualH, actualA, penaltyWinner), penaltyWinner != null, predH === predA);
}

export default async function VerificaPage({
  params,
}: {
  params: Promise<{ shortcode: string }>;
}) {
  const { shortcode } = await params;

  if (!/^[0-9a-f]{8}$/.test(shortcode)) {
    return <NotFound />;
  }

  const allSubmissions = await db
    .select()
    .from(phaseSubmissions);

  const submission = allSubmissions.find((s) => s.phaseSeal.startsWith(shortcode));
  if (!submission) {
    return <NotFound />;
  }

  const phase = submission.phase as Phase;

  const preds = await db
    .select({
      matchId: matchPredictions.matchId,
      predictedHomeScore: matchPredictions.predictedHomeScore,
      predictedAwayScore: matchPredictions.predictedAwayScore,
    })
    .from(matchPredictions)
    .where(
      and(
        eq(matchPredictions.userId, submission.userId),
        eq(matchPredictions.ticketCode, submission.ticketCode),
      ),
    );

  const phaseMatchRows = await db
    .select({
      id: matches.id,
      matchCode: matches.matchCode,
      teamHome: matches.teamHome,
      teamAway: matches.teamAway,
      actualHomeTeam: matches.actualHomeTeam,
      actualAwayTeam: matches.actualAwayTeam,
      actualHomeScore: matches.actualHomeScore,
      actualAwayScore: matches.actualAwayScore,
      penaltyWinner: matches.penaltyWinner,
      phase: matches.phase,
    })
    .from(matches)
    .where(eq(matches.phase, phase))
    .orderBy(asc(matches.matchCode));

  const phaseMatchIds = new Set(phaseMatchRows.map((m) => m.id));
  const phasePreds = preds.filter((p) => phaseMatchIds.has(p.matchId));

  const picks = phasePreds.map((p) => {
    const m = phaseMatchRows.find((row) => row.id === p.matchId)!;
    return { match_code: m.matchCode, h: p.predictedHomeScore, a: p.predictedAwayScore };
  });

  const sealSecret = process.env.SEAL_SECRET!;
  const isValid = verifyPhaseSeal(phase, picks, submission.phaseSeal, sealSecret);

  if (!isValid) {
    await db.insert(auditLog).values({
      eventType: 'seal_mismatch',
      userId: submission.userId,
      ticketCode: submission.ticketCode,
      payload: { shortcode, phase, expected_seal: submission.phaseSeal },
    });
  }

  const predMap = new Map(phasePreds.map((p) => [p.matchId, p]));

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/stadium-night.jpg)', filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/55 via-[#1a3a6b]/45 to-[#2c1810]/55" />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(58,99,168,0.45), transparent 65%)' }} />

      <div className="relative z-10">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <BrandHeader />
          <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">Ir al inicio</Link>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <article className="relative overflow-hidden rounded-3xl backdrop-blur-2xl saturate-200 bg-gradient-to-br from-white/[0.12] via-white/[0.05] to-white/[0.02] border-2 border-brand-red/40 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-brand-red/30 blur-3xl rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#3A63A8]/30 blur-3xl rounded-full pointer-events-none" />

            <div className="relative p-5 sm:p-8 md:p-12">
              <div className="flex items-start gap-4 mb-8">
                <div className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${isValid ? 'bg-gradient-to-br from-emerald-400 to-emerald-600' : 'bg-gradient-to-br from-red-400 to-red-600'}`}>
                  <span className="text-3xl text-white font-bold">{isValid ? '✓' : '✗'}</span>
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isValid ? 'text-emerald-400' : 'text-red-400'}`}>
                    {isValid ? 'Sello válido' : 'Sello inválido'}
                  </p>
                  <h1 className="text-2xl sm:text-3xl font-black text-white">
                    {isValid ? 'Boleto verificado' : 'Posible alteración'}
                  </h1>
                </div>
              </div>

              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mb-8">
                <div>
                  <dt className="text-xs text-white/50 uppercase tracking-wider mb-1">Fase</dt>
                  <dd className="text-base text-white font-semibold">{PHASE_LABELS[phase] ?? phase}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/50 uppercase tracking-wider mb-1">Boleto</dt>
                  <dd className="text-lg font-mono font-bold text-white">{submission.ticketCode}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/50 uppercase tracking-wider mb-1">Sello corto</dt>
                  <dd className="text-lg font-mono font-bold text-brand-red">{submission.phaseSeal.slice(0, 8)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-white/50 uppercase tracking-wider mb-1">Fecha</dt>
                  <dd className="text-base text-white">{submission.submittedAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}</dd>
                </div>
              </dl>

              <div className="bg-black/30 border border-white/10 rounded-xl p-4 mb-8 font-mono text-xs text-white/60 break-all">
                {submission.phaseSeal}
              </div>

              {isValid && (
                <div className="space-y-2 mb-8">
                  <h2 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">Predicciones registradas</h2>
                  {phaseMatchRows.map((m) => {
                    const pred = predMap.get(m.id);
                    const homeRaw = m.actualHomeTeam ?? m.teamHome;
                    const awayRaw = m.actualAwayTeam ?? m.teamAway;
                    const hasResult = m.actualHomeScore != null && m.actualAwayScore != null;
                    const pts = hasResult && pred ? getMatchResult(pred.predictedHomeScore, pred.predictedAwayScore, m.actualHomeScore!, m.actualAwayScore!, m.penaltyWinner as PenaltyWinner) : null;
                    return (
                      <div key={m.id} className={`backdrop-blur rounded-xl p-3 text-sm border ${
                        pts?.pts === 5 ? 'bg-emerald-500/10 border-emerald-400/30'
                        : pts?.pts === 2 ? 'bg-blue-500/10 border-blue-400/30'
                        : pts?.pts === 0 ? 'bg-red-500/10 border-red-400/20'
                        : 'bg-white/[0.06] border-white/10'
                      }`}>
                        <div className="flex items-center gap-2">
                          <img src={getFlagUrl(homeRaw, 'sm')} alt="" className="w-5 h-3.5 rounded-sm object-cover" loading="lazy" />
                          <span className="flex-1 text-right text-white font-medium truncate">{getTeamDisplayName(homeRaw)}</span>
                          <span className="w-8 text-center text-white font-bold">{pred?.predictedHomeScore ?? '-'}</span>
                          <span className="text-white/30">–</span>
                          <span className="w-8 text-center text-white font-bold">{pred?.predictedAwayScore ?? '-'}</span>
                          <span className="flex-1 text-white font-medium truncate">{getTeamDisplayName(awayRaw)}</span>
                          <img src={getFlagUrl(awayRaw, 'sm')} alt="" className="w-5 h-3.5 rounded-sm object-cover" loading="lazy" />
                        </div>
                        {hasResult && pts && (
                          <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
                            <span className="text-sm text-white/80">Real: <span className="font-mono font-semibold">{m.actualHomeScore}–{m.actualAwayScore}</span></span>
                            {m.penaltyWinner && (
                              <span className="text-[11px] font-semibold text-amber-300">· Penales: Ganó {getTeamDisplayName(m.penaltyWinner === 'home' ? (m.actualHomeTeam ?? m.teamHome) : (m.actualAwayTeam ?? m.teamAway))}</span>
                            )}
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${pts.bg} ${pts.shadow}`}>
                              {pts.icon} {pts.label}
                            </span>
                          </div>
                        )}
                        {!hasResult && (
                          <div className="mt-2 pt-2 border-t border-white/10">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-white/[0.08] text-white/60">⏳ Próximo</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <p className="text-sm text-white/50 leading-relaxed">
                Este sello fue generado al momento del registro y no puede modificarse. Garantiza la integridad de las predicciones del participante en la Dinámica Goleadora CanaBRAKE × Brake Station.
              </p>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/stadium-night.jpg)', filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/55 via-[#1a3a6b]/45 to-[#2c1810]/55" />
      <div className="relative z-10">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <BrandHeader />
          <Link href="/" className="text-sm text-white/70 hover:text-white transition-colors">Ir al inicio</Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-12">
          <article className="relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-red-500/[0.10] via-white/[0.05] to-white/[0.02] border-2 border-red-500/40 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
            <div className="absolute -top-20 -left-20 w-72 h-72 bg-red-500/30 blur-3xl rounded-full pointer-events-none" />
            <div className="relative p-5 sm:p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 shadow-lg mb-6">
                <span className="text-3xl text-white font-bold">✗</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">Sello no encontrado</h1>
              <p className="text-white/60 mb-6">El código de verificación no coincide con ninguna quiniela registrada.</p>
              <Link href="/" className="text-blue-300 text-sm hover:underline">← Ir al inicio</Link>
            </div>
          </article>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
