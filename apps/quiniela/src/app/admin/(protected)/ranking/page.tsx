import { db } from '@brakestation/db';
import { matchPredictions, matches, users, triviaResponses, trivias, phaseSubmissions, tickets, ticketRegistrations } from '@brakestation/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import Link from 'next/link';
import { computeTriviaPointsByUser } from '@/lib/compute-trivia-points';
import { scoreMatch, type PenaltyWinner } from '@/lib/score-match';

export const dynamic = 'force-dynamic';

type CohortFilter = 'all' | 'public' | 'int';

export default async function AdminRankingPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortParam } = await searchParams;
  const cohort: CohortFilter =
    cohortParam === 'public' ? 'public' : cohortParam === 'int' ? 'int' : 'all';
  const scoredMatches = await db
    .select({ id: matches.id, actualHomeScore: matches.actualHomeScore, actualAwayScore: matches.actualAwayScore, penaltyWinner: matches.penaltyWinner })
    .from(matches)
    .where(and(isNotNull(matches.actualHomeScore), isNotNull(matches.actualAwayScore)));

  const scoreMap = new Map(scoredMatches.map((m) => [m.id, { h: m.actualHomeScore!, a: m.actualAwayScore!, pw: m.penaltyWinner as PenaltyWinner }]));
  const scoredMatchIds = new Set(scoredMatches.map((m) => m.id));

  const allPredictions = await db
    .select({ userId: matchPredictions.userId, matchId: matchPredictions.matchId, predictedHomeScore: matchPredictions.predictedHomeScore, predictedAwayScore: matchPredictions.predictedAwayScore })
    .from(matchPredictions);

  const allUsers = await db.select({ id: users.id, name: users.name, email: users.email }).from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allTickets = await db.select({ code: tickets.code, type: tickets.type, assignedUserId: tickets.assignedUserId }).from(tickets).where(isNotNull(tickets.assignedUserId));
  const ticketByUser = new Map(allTickets.map((t) => [t.assignedUserId!, { code: t.code, type: t.type }]));

  const matchPointsByUser = new Map<string, number>();
  for (const pred of allPredictions) {
    if (!scoredMatchIds.has(pred.matchId)) continue;
    const actual = scoreMap.get(pred.matchId)!;
    const pts = scoreMatch(pred.predictedHomeScore, pred.predictedAwayScore, actual.h, actual.a, actual.pw);
    matchPointsByUser.set(pred.userId, (matchPointsByUser.get(pred.userId) ?? 0) + pts);
  }

  const allTriviaResponses = await db
    .select({ userId: triviaResponses.userId, triviaId: triviaResponses.triviaId, selectedOption: triviaResponses.selectedOption })
    .from(triviaResponses);
  const allTrivias = await db
    .select({ id: trivias.id, phaseLabel: trivias.phaseLabel, question: trivias.question, correctOption: trivias.correctOption, opensAt: trivias.opensAt })
    .from(trivias);

  const triviaPointsByUser = computeTriviaPointsByUser(allTriviaResponses, allTrivias);

  const allRegs = await db.select({ userId: ticketRegistrations.userId, socialBonusGranted: ticketRegistrations.socialBonusGranted, participantName: ticketRegistrations.participantName }).from(ticketRegistrations).where(eq(ticketRegistrations.reviewStatus, 'approved'));
  const approvedUserIds = new Set(allRegs.map((r) => r.userId));
  const socialBonusByUser = new Map(allRegs.map((r) => [r.userId, r.socialBonusGranted ? 10 : 0]));
  const participantNameByUser = new Map(allRegs.map((r) => [r.userId, r.participantName]));

  const allSubmissions = await db.select({ userId: phaseSubmissions.userId }).from(phaseSubmissions);
  const participatingUserIds = new Set(
    allSubmissions.map((s) => s.userId).filter((id) => approvedUserIds.has(id))
  );

  type RankedUser = { name: string; email: string; ticketCode: string; ticketType: string; matchPoints: number; triviaPoints: number; bonusPoints: number; totalPoints: number };

  const allRanked: RankedUser[] = [];
  for (const userId of participatingUserIds) {
    const user = userMap.get(userId);
    if (!user) continue;
    const ticket = ticketByUser.get(userId);
    const mp = matchPointsByUser.get(userId) ?? 0;
    const tp = triviaPointsByUser.get(userId) ?? 0;
    const bp = socialBonusByUser.get(userId) ?? 0;
    allRanked.push({
      name: participantNameByUser.get(userId) ?? user.name ?? 'Sin nombre',
      email: user.email ?? '',
      ticketCode: ticket?.code ?? '—',
      ticketType: ticket?.type ?? '—',
      matchPoints: mp,
      triviaPoints: tp,
      bonusPoints: bp,
      totalPoints: mp + tp + bp,
    });
  }

  allRanked.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));

  const counts = {
    all: allRanked.length,
    public: allRanked.filter((r) => r.ticketType !== 'INT').length,
    int: allRanked.filter((r) => r.ticketType === 'INT').length,
  };

  const ranked =
    cohort === 'public'
      ? allRanked.filter((r) => r.ticketType !== 'INT')
      : cohort === 'int'
      ? allRanked.filter((r) => r.ticketType === 'INT')
      : allRanked;

  const tabs: { key: CohortFilter; label: string; count: number }[] = [
    { key: 'all', label: 'Todos', count: counts.all },
    { key: 'public', label: 'Público', count: counts.public },
    { key: 'int', label: 'Internos', count: counts.int },
  ];

  const PODIUM: Record<number, string> = {
    0: 'bg-gradient-to-r from-amber-500/[0.10] via-transparent to-transparent border-l-4 border-l-yellow-500',
    1: 'bg-gradient-to-r from-slate-300/[0.08] via-transparent to-transparent border-l-4 border-l-slate-300',
    2: 'bg-gradient-to-r from-amber-700/[0.10] via-transparent to-transparent border-l-4 border-l-amber-700',
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-black text-white mb-1">Admin · <span className="text-brand-red">Ranking</span></h1>
        <p className="text-white/80 text-sm">Ranking completo con emails · {ranked.length} participante{ranked.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="flex gap-1 mb-6 overflow-x-auto flex-nowrap">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === 'all' ? '/admin/ranking' : `/admin/ranking?cohort=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              cohort === t.key
                ? 'bg-white/[0.15] text-white'
                : 'text-white/60 hover:bg-white/[0.05]'
            }`}
          >
            {t.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                cohort === t.key ? 'bg-white/20 text-white' : 'bg-white/[0.10] text-white/60'
              }`}
            >
              {t.count}
            </span>
          </Link>
        ))}
      </div>

      {ranked.length === 0 ? (
        <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-16 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h2 className="text-xl font-bold text-white mb-2">Sin puntajes todavía</h2>
          <p className="text-white/70 mb-2">El ranking aparece cuando se carguen resultados de partidos jugados.</p>
          <p className="text-white/50 text-sm">Primer partido: 11 de junio · México vs Sudáfrica</p>
        </div>
      ) : (
        <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.05] border-b border-white/[0.15]">
              <tr>
                <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider w-12">#</th>
                <th className="px-4 py-3 text-left text-white/80 font-semibold uppercase text-xs tracking-wider">Nombre</th>
                <th className="px-4 py-3 text-left text-white/80 font-semibold uppercase text-xs tracking-wider hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left text-white/80 font-semibold uppercase text-xs tracking-wider hidden lg:table-cell">Boleto</th>
                <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Partidos</th>
                <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Trivias</th>
                <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider hidden sm:table-cell">Bonus</th>
                <th className="px-4 py-3 text-center text-white/80 font-semibold uppercase text-xs tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r, i) => (
                <tr key={i} className={`border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors ${PODIUM[i] ?? ''}`}>
                  <td className="px-4 py-3 text-center">
                    {i < 3 ? <span className="text-2xl">{['🥇','🥈','🥉'][i]}</span> : <span className="text-white/60 font-mono">{i + 1}</span>}
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-white/75 text-xs font-mono hidden md:table-cell">{r.email}</td>
                  <td className="px-4 py-3 text-white/85 font-mono hidden lg:table-cell">{r.ticketCode}</td>
                  <td className="px-4 py-3 text-center text-white/90 hidden sm:table-cell">{r.matchPoints}</td>
                  <td className="px-4 py-3 text-center text-white/90 hidden sm:table-cell">{r.triviaPoints}</td>
                  <td className="px-4 py-3 text-center hidden sm:table-cell">
                    {r.bonusPoints > 0 ? <span className="text-yellow-300 font-bold">⭐ {r.bonusPoints}</span> : <span className="text-white/40">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center"><span className="text-brand-red font-bold text-lg">{r.totalPoints}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
