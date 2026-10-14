// Lógica pura del ranking (sin DB) para poder testearla con tsx.
import { scoreMatch, POINTS, type PenaltyWinner } from './score-match';

export type RankPrediction = { userId: string; matchId: string; h: number; a: number; submittedAt: Date };
export type RankResult = { h: number; a: number; pw: PenaltyWinner };

export type RankedUser = {
  userId: string;
  name: string; // "Luis M."
  totalPoints: number;
  exactHits: number;
  resultHits: number;
  predictions: number;
  lastSubmittedAt: Date;
};

export function firstNameInitial(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? 'Participante';
  return `${parts[0]} ${(parts[1]?.[0] ?? '').toUpperCase()}.`;
}

/**
 * Ordena por: (1) puntos, (2) más marcadores exactos, (3) más resultados
 * acertados, (4) quien guardó su último pronóstico más temprano.
 * Participa cualquiera con al menos un pronóstico guardado.
 */
export function rankEntries(
  preds: RankPrediction[],
  results: Map<string, RankResult>,
  names: Map<string, string | null>,
): RankedUser[] {
  const byUser = new Map<string, RankedUser>();
  for (const p of preds) {
    let r = byUser.get(p.userId);
    if (!r) {
      r = { userId: p.userId, name: firstNameInitial(names.get(p.userId) ?? 'Participante'), totalPoints: 0, exactHits: 0, resultHits: 0, predictions: 0, lastSubmittedAt: p.submittedAt };
      byUser.set(p.userId, r);
    }
    r.predictions++;
    if (p.submittedAt > r.lastSubmittedAt) r.lastSubmittedAt = p.submittedAt;
    const actual = results.get(p.matchId);
    if (!actual) continue;
    const pts = scoreMatch(p.h, p.a, actual.h, actual.a, actual.pw);
    r.totalPoints += pts;
    if (pts === POINTS.exact) r.exactHits++;
    else if (pts === POINTS.result) r.resultHits++;
  }
  return [...byUser.values()].sort(
    (a, b) =>
      b.totalPoints - a.totalPoints ||
      b.exactHits - a.exactHits ||
      b.resultHits - a.resultHits ||
      a.lastSubmittedAt.getTime() - b.lastSubmittedAt.getTime(),
  );
}
