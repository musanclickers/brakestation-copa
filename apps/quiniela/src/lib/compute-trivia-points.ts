// Trivia scoring helper.
//
// CONTEXT: a bug in the deploy pipeline re-applied the trivias seed on every
// release, producing multiple "copies" of the same question with different
// trivia_id values. Participants saw and answered several copies and the
// ranking was inflating points (2 pts × N copies × correct = 2N pts for one
// real question). We dedupe the responses at READ time so the seals stay
// intact in trivia_responses — nothing destructive.
//
// RULE (refined 2026-06-18):
// - Questions are grouped into clusters by (phase_label, normalized question).
// - A participant earns 2 pts per cluster answered correctly, counting ANY copy
//   they answered (the early UI showed duplicate copies, so correct answers live
//   on non-canonical ids too). Each cluster is credited AT MOST once per user, so
//   answering several copies of the same question never inflates the score.
// - getCanonicalTriviaIds (oldest per cluster) is still used to DISPLAY a single
//   copy on the trivias page; it no longer gates scoring.
//
// Normalization: lowercase + trim + collapse all whitespace. This catches
// invisible diffs (stray spaces, newlines from copy/paste) that broke the
// previous dedupe.

export type TriviaForScoring = {
  id: string;
  phaseLabel: string;
  question: string;
  correctOption: string;
  opensAt: Date;
};

export type ResponseForScoring = {
  userId: string;
  triviaId: string;
  selectedOption: string;
};

function normalizeQuestion(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Returns the set of canonical trivia IDs — the oldest trivia of each
 * (phase_label, normalized question) cluster. Duplicate trivias (created by
 * the seed bug) are NOT canonical.
 */
export function getCanonicalTriviaIds(trivias: TriviaForScoring[]): Set<string> {
  const oldestPerCluster = new Map<string, TriviaForScoring>();
  for (const t of trivias) {
    const key = `${t.phaseLabel}|${normalizeQuestion(t.question)}`;
    const cur = oldestPerCluster.get(key);
    if (!cur || t.opensAt.getTime() < cur.opensAt.getTime()) {
      oldestPerCluster.set(key, t);
    }
  }
  return new Set([...oldestPerCluster.values()].map((t) => t.id));
}

// Maps every trivia id (canonical AND duplicates) to its cluster key and correct
// option. Scoring dedupes by CLUSTER, not by canonical id: a participant who
// answered a duplicate copy (because the UI showed it to them before the dedup
// display fix) still earns the point. Inflation is prevented by crediting each
// cluster at most once per user.
function buildTriviaIndex(
  trivias: TriviaForScoring[],
): Map<string, { cluster: string; correct: string }> {
  const idx = new Map<string, { cluster: string; correct: string }>();
  for (const t of trivias) {
    idx.set(t.id, {
      cluster: `${t.phaseLabel}|${normalizeQuestion(t.question)}`,
      correct: t.correctOption,
    });
  }
  return idx;
}

/**
 * Builds a Map<userId, points>. 2 pts per distinct question (cluster) answered
 * correctly, regardless of which copy was answered. Capped once per cluster.
 */
export function computeTriviaPointsByUser(
  responses: ResponseForScoring[],
  trivias: TriviaForScoring[],
): Map<string, number> {
  const idx = buildTriviaIndex(trivias);
  const creditedByUser = new Map<string, Set<string>>();
  const points = new Map<string, number>();
  for (const r of responses) {
    const info = idx.get(r.triviaId);
    if (!info || r.selectedOption !== info.correct) continue;
    let credited = creditedByUser.get(r.userId);
    if (!credited) {
      credited = new Set();
      creditedByUser.set(r.userId, credited);
    }
    if (credited.has(info.cluster)) continue; // already counted this question
    credited.add(info.cluster);
    points.set(r.userId, (points.get(r.userId) ?? 0) + 2);
  }
  return points;
}

/**
 * Single-user variant for dashboard. 2 pts per distinct question answered
 * correctly (any copy), capped once per cluster.
 */
export function computeTriviaPointsForResponses(
  responses: Pick<ResponseForScoring, 'triviaId' | 'selectedOption'>[],
  trivias: TriviaForScoring[],
): number {
  const idx = buildTriviaIndex(trivias);
  const credited = new Set<string>();
  let pts = 0;
  for (const r of responses) {
    const info = idx.get(r.triviaId);
    if (!info || r.selectedOption !== info.correct) continue;
    if (credited.has(info.cluster)) continue;
    credited.add(info.cluster);
    pts += 2;
  }
  return pts;
}

/**
 * For UI badges that show "Llevas N respondidas". Counts distinct questions
 * (clusters) the participant answered — any copy — so it matches the points
 * shown (one cluster = one question, regardless of duplicate copies answered).
 */
export function countCanonicalResponses(
  responses: Pick<ResponseForScoring, 'triviaId'>[],
  trivias: TriviaForScoring[],
): number {
  const idx = buildTriviaIndex(trivias);
  const clusters = new Set<string>();
  for (const r of responses) {
    const info = idx.get(r.triviaId);
    if (info) clusters.add(info.cluster);
  }
  return clusters.size;
}
