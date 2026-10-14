// Única fuente del leaderboard. Lo usan /ranking, el dashboard ("vas en el
// lugar N") y el ranking del admin.
//
// ponytail: recalcula desde las filas en cada llamada (sin cache). Sobra para
// cientos de participantes; agregar cache corto si algún día pesa.
// TODO(2027 refactor): filtrar matches/predictions por edition_id.

import { db } from '@brakestation/db';
import { matchPredictions, matches, users } from '@brakestation/db/schema';
import { and, isNotNull } from 'drizzle-orm';
import { rankEntries, type RankedUser, type RankResult } from './rank-entries';
import type { PenaltyWinner } from './score-match';

export { firstNameInitial, type RankedUser } from './rank-entries';

export async function computeRanking(): Promise<RankedUser[]> {
  const [scored, preds, allUsers] = await Promise.all([
    db
      .select({ id: matches.id, h: matches.actualHomeScore, a: matches.actualAwayScore, pw: matches.penaltyWinner })
      .from(matches)
      .where(and(isNotNull(matches.actualHomeScore), isNotNull(matches.actualAwayScore))),
    db
      .select({ userId: matchPredictions.userId, matchId: matchPredictions.matchId, h: matchPredictions.predictedHomeScore, a: matchPredictions.predictedAwayScore, submittedAt: matchPredictions.submittedAt })
      .from(matchPredictions),
    db.select({ id: users.id, name: users.name }).from(users),
  ]);

  const results = new Map<string, RankResult>(scored.map((m) => [m.id, { h: m.h!, a: m.a!, pw: m.pw as PenaltyWinner }]));
  return rankEntries(preds, results, new Map(allUsers.map((u) => [u.id, u.name])));
}
