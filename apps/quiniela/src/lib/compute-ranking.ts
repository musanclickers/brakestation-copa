// Single source of truth for the leaderboard. Used by /ranking (top 50) and
// the participant dashboard (to show "vas en el lugar N"). Keeping the scoring
// in one place avoids the dashboard total drifting from the ranking total
// (e.g. the social bonus, which the dashboard used to omit).
//
// ponytail: recomputes from raw rows on every call (no cache). Fine at this
// scale (hundreds of participants); add a short-TTL cache if it gets heavy.

import { scoreMatch, type PenaltyWinner } from './score-match';
import { db } from '@brakestation/db';
import {
  matchPredictions,
  matches,
  users,
  triviaResponses,
  trivias,
  phaseSubmissions,
  tickets,
  ticketRegistrations,
} from '@brakestation/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { computeTriviaPointsByUser } from './compute-trivia-points';

export type RankedUser = {
  userId: string;
  name: string; // masked: "Luis M."
  ticketCode: string;
  ticketType: string;
  matchPoints: number;
  triviaPoints: number;
  bonusPoints: number;
  totalPoints: number;
};

export function firstNameInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? 'Participante';
  return `${parts[0]} ${(parts[1]?.[0] ?? '').toUpperCase()}.`;
}

/**
 * Returns the cohort leaderboard sorted by total points desc. Only participants
 * with at least one sealed phase AND an approved registration are ranked.
 */
export async function computeRanking(cohort: 'public' | 'int'): Promise<RankedUser[]> {
  const scoredMatches = await db
    .select({ id: matches.id, actualHomeScore: matches.actualHomeScore, actualAwayScore: matches.actualAwayScore, penaltyWinner: matches.penaltyWinner })
    .from(matches)
    .where(and(isNotNull(matches.actualHomeScore), isNotNull(matches.actualAwayScore)));

  const scoreMap = new Map(scoredMatches.map((m) => [m.id, { h: m.actualHomeScore!, a: m.actualAwayScore!, pw: m.penaltyWinner as PenaltyWinner }]));
  const scoredMatchIds = new Set(scoredMatches.map((m) => m.id));

  const allPredictions = await db
    .select({ userId: matchPredictions.userId, matchId: matchPredictions.matchId, predictedHomeScore: matchPredictions.predictedHomeScore, predictedAwayScore: matchPredictions.predictedAwayScore })
    .from(matchPredictions);

  const allUsers = await db.select({ id: users.id, name: users.name }).from(users);
  const userMap = new Map(allUsers.map((u) => [u.id, u]));

  const allTickets = await db
    .select({ code: tickets.code, assignedUserId: tickets.assignedUserId, type: tickets.type })
    .from(tickets)
    .where(isNotNull(tickets.assignedUserId));
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

  const allRegs = await db
    .select({ userId: ticketRegistrations.userId, socialBonusGranted: ticketRegistrations.socialBonusGranted, participantName: ticketRegistrations.participantName })
    .from(ticketRegistrations)
    .where(eq(ticketRegistrations.reviewStatus, 'approved'));
  const approvedUserIds = new Set(allRegs.map((r) => r.userId));
  const socialBonusByUser = new Map(allRegs.map((r) => [r.userId, r.socialBonusGranted ? 10 : 0]));
  const participantNameByUser = new Map(allRegs.map((r) => [r.userId, r.participantName]));

  const allSubmissions = await db.select({ userId: phaseSubmissions.userId }).from(phaseSubmissions);
  const participatingUserIds = new Set(
    allSubmissions.map((s) => s.userId).filter((id) => approvedUserIds.has(id)),
  );

  const ranked: RankedUser[] = [];
  for (const userId of participatingUserIds) {
    const user = userMap.get(userId);
    if (!user) continue;
    const ticket = ticketByUser.get(userId);
    if (!ticket) continue;
    if (cohort === 'int' && ticket.type !== 'INT') continue;
    if (cohort === 'public' && ticket.type === 'INT') continue;
    const mp = matchPointsByUser.get(userId) ?? 0;
    const tp = triviaPointsByUser.get(userId) ?? 0;
    const bp = socialBonusByUser.get(userId) ?? 0;
    ranked.push({
      userId,
      name: firstNameInitial(participantNameByUser.get(userId) ?? user.name ?? 'Participante'),
      ticketCode: ticket.code,
      ticketType: ticket.type,
      matchPoints: mp,
      triviaPoints: tp,
      bonusPoints: bp,
      totalPoints: mp + tp + bp,
    });
  }

  ranked.sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name));
  return ranked;
}
