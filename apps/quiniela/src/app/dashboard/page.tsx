import { db } from '@brakestation/db';
import { phaseSubmissions, matchPredictions, matches, triviaResponses, trivias, tickets, ticketRegistrations } from '@brakestation/db/schema';
import { PHASE_ORDER, PHASE_LABELS, PHASE_MATCH_COUNTS, type Phase, getCurrentPhase, isPhaseOpen, computeOpensAt, isPhasePreviewable } from '@brakestation/db/phases';
import { eq, and, isNotNull, inArray, sql, or } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getFlagUrl } from '@brakestation/ui/flags';
import { getTeamDisplayName } from '@brakestation/ui/teams';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { PhaseProgressRing } from '@/components/PhaseProgressRing';
import { getAuthUser } from '@/lib/get-auth-user';
import {
  computeTriviaPointsForResponses,
  countCanonicalResponses,
} from '@/lib/compute-trivia-points';
import { computeRanking } from '@/lib/compute-ranking';
import { scoreMatch, type PenaltyWinner } from '@/lib/score-match';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const { as: impersonateId } = await searchParams;
  const user = await getAuthUser(impersonateId);
  if (!user) redirect('/activar');

  // Propagate ?as= to downstream links so admin impersonation persists
  // across navigations to /trivias and /quiniela.
  const asSuffix = user.impersonating && impersonateId ? `&as=${impersonateId}` : '';
  const asSuffixFirst = user.impersonating && impersonateId ? `?as=${impersonateId}` : '';

  const userTickets = await db
    .select({ code: tickets.code, type: tickets.type, registrationId: tickets.registrationId, registrationRequired: tickets.registrationRequired })
    .from(tickets)
    .where(eq(tickets.assignedUserId, user.id));

  const isInternalParticipant = userTickets.some((t) => t.type === 'INT');
  const rankingHref = isInternalParticipant ? '/ranking?cohort=int' : '/ranking';
  const rankingLabel = isInternalParticipant ? 'Ver ranking interno →' : 'Ver ranking →';

  const hasActivatedTicket = userTickets.some((t) => {
    if (!t.registrationRequired) return true;
    return t.registrationId !== null;
  });

  let pendingReview = false;
  if (!hasActivatedTicket && userTickets.length > 0) {
    const pendingReg = await db.query.ticketRegistrations.findFirst({
      where: and(
        eq(ticketRegistrations.userId, user.id),
        or(
          eq(ticketRegistrations.reviewStatus, 'pending'),
          eq(ticketRegistrations.reviewStatus, 'awaiting_new_photo'),
        ),
      ),
    });
    pendingReview = !!pendingReg;
  }

  const submissions = await db
    .select()
    .from(phaseSubmissions)
    .where(eq(phaseSubmissions.userId, user.id));

  const submittedMap = new Map(submissions.map((s) => [s.phase, s]));
  const ticketCode = submissions[0]?.ticketCode ?? userTickets[0]?.code ?? null;

  const currentPhase = await getCurrentPhase();
  const phaseOpenMap: Record<string, boolean> = {};
  const phaseOpensAtMap: Record<string, Date | null> = {};
  for (const phase of PHASE_ORDER) {
    const result = await isPhaseOpen(phase);
    phaseOpenMap[phase] = result.open;
    phaseOpensAtMap[phase] = result.opensAt ?? await computeOpensAt(phase);
  }

  const phasePreviewMap: Record<string, boolean> = {};
  for (const phase of PHASE_ORDER) {
    phasePreviewMap[phase] = (await isPhasePreviewable(phase)).previewable;
  }
  const showEliminatoria = phasePreviewMap['r32'] || phaseOpenMap['r32'] || false;

  // Orden: abiertas/preview primero, próximas después, selladas al final.
  function rank(phase: Phase): number {
    if (submittedMap.has(phase)) return 3;            // selladas al final
    if (phaseOpenMap[phase]) return 0;                // abiertas primero
    if (phasePreviewMap[phase]) return 1;             // preview
    return 2;                                         // próximas
  }
  const orderedPhases = [...PHASE_ORDER].sort((a, b) => rank(a) - rank(b));

  let matchPoints = 0;
  if (submissions.length > 0) {
    const scoredMatches = await db
      .select({ id: matches.id, actualHomeScore: matches.actualHomeScore, actualAwayScore: matches.actualAwayScore, penaltyWinner: matches.penaltyWinner })
      .from(matches)
      .where(and(isNotNull(matches.actualHomeScore), isNotNull(matches.actualAwayScore)));

    if (scoredMatches.length > 0) {
      const scoreMap = new Map(scoredMatches.map((m) => [m.id, { h: m.actualHomeScore!, a: m.actualAwayScore!, pw: m.penaltyWinner as PenaltyWinner }]));
      const preds = await db
        .select({ matchId: matchPredictions.matchId, predictedHomeScore: matchPredictions.predictedHomeScore, predictedAwayScore: matchPredictions.predictedAwayScore })
        .from(matchPredictions)
        .where(eq(matchPredictions.userId, user.id));

      for (const pred of preds) {
        const actual = scoreMap.get(pred.matchId);
        if (!actual) continue;
        matchPoints += scoreMatch(pred.predictedHomeScore, pred.predictedAwayScore, actual.h, actual.a, actual.pw);
      }
    }
  }

  const triviaResps = await db
    .select({ triviaId: triviaResponses.triviaId, selectedOption: triviaResponses.selectedOption })
    .from(triviaResponses)
    .where(eq(triviaResponses.userId, user.id));

  let triviaPoints = 0;
  let triviaRespsCanonicalCount = 0;
  if (triviaResps.length > 0) {
    const allTrivias = await db
      .select({ id: trivias.id, phaseLabel: trivias.phaseLabel, question: trivias.question, correctOption: trivias.correctOption, opensAt: trivias.opensAt })
      .from(trivias);
    triviaPoints = computeTriviaPointsForResponses(triviaResps, allTrivias);
    triviaRespsCanonicalCount = countCanonicalResponses(triviaResps, allTrivias);
  }

  // Rank within the participant's own cohort. Use the shared leaderboard so the
  // dashboard total matches the ranking exactly (incl. social bonus). Trivia-only
  // participants (no sealed phase) aren't ranked yet → myEntry is null.
  const userCohort = isInternalParticipant ? 'int' : 'public';
  const cohortRanking = await computeRanking(userCohort);
  const myRankIndex = cohortRanking.findIndex((r) => r.userId === user.id);
  const myEntry = myRankIndex >= 0 ? cohortRanking[myRankIndex] : null;

  const displayMatchPoints = myEntry?.matchPoints ?? matchPoints;
  const displayTriviaPoints = myEntry?.triviaPoints ?? triviaPoints;
  const displayBonusPoints = myEntry?.bonusPoints ?? 0;
  const totalPoints = myEntry?.totalPoints ?? matchPoints + triviaPoints;
  const myRank = myRankIndex >= 0 ? myRankIndex + 1 : null;
  const cohortSize = cohortRanking.length;

  // Groups preview data
  const groupMatches = await db
    .select({ groupLetter: matches.groupLetter, actualHomeTeam: matches.actualHomeTeam, actualAwayTeam: matches.actualAwayTeam })
    .from(matches)
    .where(inArray(matches.phase, ['groups_m1', 'groups_m2', 'groups_m3']));

  const groupsMap: Record<string, Set<string>> = {};
  for (const m of groupMatches) {
    const g = m.groupLetter ?? '?';
    if (!groupsMap[g]) groupsMap[g] = new Set();
    if (m.actualHomeTeam) groupsMap[g].add(m.actualHomeTeam);
    if (m.actualAwayTeam) groupsMap[g].add(m.actualAwayTeam);
  }
  const groups = Object.entries(groupsMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, teams]) => ({ letter, teams: Array.from(teams).sort() }));

  // Predictions count per phase
  const predCounts = await db
    .select({ phase: matches.phase, count: sql<number>`COUNT(*)::int` })
    .from(matchPredictions)
    .innerJoin(matches, eq(matchPredictions.matchId, matches.id))
    .where(eq(matchPredictions.userId, user.id))
    .groupBy(matches.phase);
  const predCountMap = new Map(predCounts.map((p) => [p.phase, p.count]));

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Layer 1: Stadium photo (boosted) */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/images/stadium-night.jpg)', filter: 'brightness(1.15) saturate(1.25) contrast(1.05)' }} />
      {/* Layer 2: Brand overlay (lighter — lets stadium lights through) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a1e3d]/55 via-[#1a3a6b]/45 to-[#2c1810]/55" />
      {/* Layer 3: Light effects (intensified + stadium ray simulation) */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at top left, rgba(58,99,168,0.45), transparent 65%), radial-gradient(ellipse at bottom right, rgba(227,33,37,0.30), transparent 70%), radial-gradient(ellipse 80% 60% at 50% 10%, rgba(255,255,255,0.15), transparent 70%)' }} />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <BrandHeader />
          <div className="sm:hidden text-center flex-1 min-w-0">
            <h1 className="text-base font-black tracking-tight text-white truncate">
              <span className="text-brand-red">Goleadora</span> CanaBRAKE
            </h1>
          </div>
          <div className="hidden sm:block text-center flex-1">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Vive el <span className="text-brand-red">Mundial</span> con <span className="text-brand-red">CanaBRAKE</span>
            </h1>
            <p className="text-white/50 text-base">Predice. Acumula puntos. Gana.</p>
          </div>
          <div className="text-right">
            {ticketCode && <p className="text-xs font-mono font-bold text-brand-red">{ticketCode}</p>}
            <p className="text-[10px] text-white/50">{user.email}</p>
          </div>
        </header>

        {user.impersonating && (
          <div className="bg-amber-500/90 text-black text-center text-xs font-bold py-1.5 px-4">
            Vista admin — viendo como {user.email}
            <Link href="/admin/registrations" className="ml-3 underline">← Volver al admin</Link>
          </div>
        )}
        {user.isAdmin && !user.impersonating && (
          <div className="bg-blue-500/90 text-white text-center text-xs font-bold py-1.5 px-4">
            Vista admin — estás viendo el dashboard de participante
            <Link href="/admin/registrations" className="ml-3 underline">← Volver al admin</Link>
          </div>
        )}

        <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-12 space-y-8">
          {/* Ticket status */}
          {!hasActivatedTicket && !user.isAdmin && (
            pendingReview ? (
              <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-400/30 rounded-3xl p-5">
                <h2 className="font-bold text-amber-200 text-lg mb-1">Tu registro está en revisión</h2>
                <p className="text-sm text-amber-100/70">Puedes llenar tu quiniela mientras tanto. Si tu registro no es aprobado, tus predicciones no tendrán validez.</p>
              </div>
            ) : (
              <div className="backdrop-blur-xl bg-amber-500/10 border border-amber-400/30 rounded-3xl p-6">
                <h2 className="font-bold text-white text-lg mb-1">Activa tu boleto</h2>
                <p className="text-sm text-white/70 mb-4">Necesitas un boleto activado para participar.</p>
                <Link href="/activar?force=1" className="inline-block bg-brand-red text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-600 transition-colors">
                  Activar boleto
                </Link>
              </div>
            )
          )}

          {/* Trivias — prominent banner so participants don't miss them */}
          {(ticketCode || user.isAdmin) && (
            <section>
              <Link
                href={ticketCode ? `/trivias?ticket=${ticketCode}${asSuffix}` : `/trivias${asSuffixFirst}`}
                className="block group relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-[#FFD400]/[0.20] via-[#FFD400]/[0.08] to-white/[0.02] border border-[#FFD400]/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:from-[#FFD400]/[0.28] hover:-translate-y-1 transition-all duration-300 p-5 sm:p-6"
              >
                <div className="absolute -top-16 -right-16 w-56 h-56 bg-[#FFD400]/25 blur-3xl rounded-full pointer-events-none" />
                <div className="relative flex items-center gap-4 sm:gap-6">
                  <div className="text-5xl sm:text-6xl flex-shrink-0">🧠</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#FFD400]/90 text-[#1a1a2e] text-[10px] font-bold uppercase tracking-wider">Bonus</span>
                      <span className="text-[10px] text-white/60 uppercase tracking-wider">+2 pts por acierto</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white mb-1">Responde las trivias</h2>
                    <p className="text-sm text-white/70">
                      {triviaRespsCanonicalCount > 0
                        ? `Llevas ${triviaRespsCanonicalCount} respondida${triviaRespsCanonicalCount === 1 ? '' : 's'} · ${triviaPoints} pts ganados`
                        : 'Suma puntos extra antes que cierren'}
                    </p>
                  </div>
                  <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-full bg-[#FFD400] text-[#1a1a2e] font-black text-xl flex-shrink-0 group-hover:scale-110 transition-transform">→</div>
                </div>
              </Link>
            </section>
          )}

          {showEliminatoria && (ticketCode || user.isAdmin) && (
            <section>
              <Link
                href={`/eliminatoria${asSuffixFirst}`}
                className="block rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-brand-blue/[0.20] via-white/[0.05] to-white/[0.02] border border-brand-blue/40 p-5 sm:p-6 hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="text-5xl">🏆</div>
                  <div className="flex-1">
                    <h2 className="text-xl font-black text-white mb-1">Mira la eliminatoria</h2>
                    <p className="text-sm text-white/70">El árbol del Mundial: cruces y horarios de Dieciseisavos en adelante.</p>
                  </div>
                  <div className="hidden sm:flex w-12 h-12 rounded-full bg-brand-blue/80 text-white items-center justify-center font-black">→</div>
                </div>
              </Link>
            </section>
          )}

          {/* Phase cards grid */}
          <section>
            <h2 className="text-white/70 text-sm font-semibold uppercase tracking-wider mb-4">Tus fases</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {orderedPhases.map((phase) => {
                const sub = submittedMap.get(phase);
                const isOpen = phaseOpenMap[phase];
                const predicted = predCountMap.get(phase) ?? 0;
                const total = PHASE_MATCH_COUNTS[phase];

                if (sub) {
                  return (
                    <article key={phase} className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-green-500/[0.08] border border-green-400/20 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white/80 truncate">{PHASE_LABELS[phase]}</h3>
                          <p className="text-[10px] text-green-300/70">✓ Sellada · {sub.phaseSeal.slice(0, 8)}</p>
                        </div>
                        <Link
                          href={`/quiniela?ticket=${ticketCode}&phase=${phase}${asSuffix}`}
                          className="flex-shrink-0 text-[11px] px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-emerald-100 font-semibold hover:bg-emerald-500/25"
                        >
                          Ver →
                        </Link>
                      </div>
                    </article>
                  );
                }

                if (isOpen && (ticketCode || user.isAdmin)) {
                  return (
                    <article key={phase} className="group relative overflow-hidden rounded-3xl backdrop-blur-2xl bg-gradient-to-br from-white/[0.12] via-white/[0.05] to-white/[0.02] border border-white/[0.18] shadow-[0_20px_60px_rgba(0,0,0,0.35)] hover:bg-white/[0.15] hover:border-white/[0.28] hover:-translate-y-1 transition-all duration-300 p-6 sm:p-8">
                      <div className="absolute -top-12 -left-12 w-40 h-40 bg-brand-red/30 blur-3xl rounded-full pointer-events-none" />
                      <div className="absolute top-4 right-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-red/90 text-white text-[10px] font-bold uppercase tracking-wider shadow-lg animate-pulse">
                          <span className="w-1.5 h-1.5 bg-white rounded-full" /> Abierta
                        </span>
                      </div>
                      <div className="relative">
                        <h3 className="text-3xl font-black text-white mb-1">{PHASE_LABELS[phase]}</h3>
                        <p className="text-sm text-white/60 mb-5">{total} partidos</p>
                        <div className="flex items-center gap-4 mb-5">
                          <PhaseProgressRing predicted={predicted} total={total} />
                          <div>
                            <p className="text-2xl font-bold text-white">{predicted}/{total}</p>
                            <p className="text-[10px] text-white/50 uppercase tracking-wider">Predichos</p>
                          </div>
                        </div>
                        <Link
                          href={ticketCode ? `/quiniela?ticket=${ticketCode}&phase=${phase}${asSuffix}` : `/quiniela?phase=${phase}${asSuffix}`}
                          className="block w-full text-center px-6 py-4 bg-gradient-to-r from-brand-red to-[#c41015] hover:from-[#c41015] hover:to-brand-red text-white font-bold text-sm uppercase tracking-wide rounded-xl shadow-[0_10px_30px_rgba(227,33,37,0.4)] hover:shadow-[0_15px_40px_rgba(227,33,37,0.55)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                        >
                          {ticketCode ? 'Predecir partidos →' : 'Ver partidos →'}
                        </Link>
                      </div>
                    </article>
                  );
                }

                return (
                  <article key={phase} className="relative overflow-hidden rounded-3xl backdrop-blur-xl bg-white/[0.04] border border-white/10 p-6">
                    <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full pointer-events-none" />
                    <div className="relative">
                      <h3 className="text-xl font-bold text-white/50 mb-1">{PHASE_LABELS[phase]}</h3>
                      <p className="text-xs text-white/30">{total} partidos · Abre {phaseOpensAtMap[phase]?.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'America/Mexico_City' }) ?? 'próximamente'}</p>
                    </div>
                  </article>
                );
              })}

            </div>
          </section>

          {/* Groups preview */}
          {groups.length > 0 && (
            <section>
              <h2 className="text-white text-xl font-bold mb-4 tracking-tight">Los {groups.length} grupos del Mundial 2026</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {groups.map(({ letter, teams }) => (
                  <article key={letter} className="backdrop-blur-xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.12] rounded-2xl p-4 hover:bg-white/[0.12] hover:border-white/[0.2] transition-all">
                    <h3 className="text-white text-sm font-bold mb-2">Grupo {letter}</h3>
                    <ul className="space-y-1.5">
                      {teams.map((team) => (
                        <li key={team} className="flex items-center gap-2">
                          <img src={getFlagUrl(team, 'sm')} alt="" className="w-5 h-3.5 rounded-sm object-cover" loading="lazy" />
                          <span className="text-xs text-white/80 truncate">{getTeamDisplayName(team)}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )}

          {/* Score */}
          {(submissions.length > 0 || triviaResps.length > 0) && (
            <div className="backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Mi puntaje total</h2>
                  <div className="flex gap-4 mt-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Partidos</p>
                      <p className="text-xl font-bold text-white">{displayMatchPoints}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-white/40">Trivias</p>
                      <p className="text-xl font-bold text-white">{displayTriviaPoints}</p>
                    </div>
                    {displayBonusPoints > 0 && (
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-white/40">Bonus</p>
                        <p className="text-xl font-bold text-yellow-300">{displayBonusPoints}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Total</p>
                  <p className="text-4xl font-black text-brand-red leading-none">{totalPoints}</p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/10">
                {myRank !== null ? (
                  <p className="text-sm text-white/80">
                    Vas en el <span className="font-black text-white">#{myRank}</span>
                    <span className="text-white/50"> de {cohortSize}{isInternalParticipant ? ' (interno)' : ''}</span>
                  </p>
                ) : (
                  <p className="text-xs text-white/50">Sella una fase para entrar al ranking.</p>
                )}
              </div>
              <Link href={rankingHref} className="inline-block mt-3 text-xs text-blue-300 hover:underline">{rankingLabel}</Link>
            </div>
          )}

          <div className="flex justify-center gap-6 pt-4">
            <Link href="/" className="text-white/40 text-sm hover:text-white transition-colors">← Inicio</Link>
            <Link href={rankingHref} className="text-white/40 text-sm hover:text-white transition-colors">{isInternalParticipant ? 'Ranking interno' : 'Ranking'}</Link>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
