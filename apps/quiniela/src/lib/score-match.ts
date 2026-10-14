// Única fuente de verdad del scoring de partidos (ranking, dashboard, verifica,
// PhaseForm). Ningún otro archivo debe comparar contra los puntos a mano: usa
// POINTS o matchResultMeta.
//
// Reglas Copa Brake Station:
//  - Tiempo regular (penaltyWinner null): 10 pts marcador exacto, 3 pts acertar
//    el resultado (ganador o empate, mismo signo), 0 si no.
//  - Penales (solo Fase Final, penaltyWinner 'home'|'away'): el marcador regular
//    fue empate. 3 pts a quien predijo al equipo que avanzó, y también a quien
//    predijo cualquier empate (atinó el resultado del tiempo regular). Nunca 10.
//    La UI y el API no dejan capturar empates en Fase Final, así que el caso del
//    empate solo aplica si alguien lo guardó antes de esa regla.

export const POINTS = { exact: 10, result: 3, miss: 0 } as const;

export type PenaltyWinner = 'home' | 'away' | null | undefined;

export function scoreMatch(
  predH: number,
  predA: number,
  actualH: number,
  actualA: number,
  penaltyWinner?: PenaltyWinner,
): number {
  if (penaltyWinner === 'home' || penaltyWinner === 'away') {
    const predWinner = predH > predA ? 'home' : predH < predA ? 'away' : null;
    if (predWinner === null) return POINTS.result;
    return predWinner === penaltyWinner ? POINTS.result : POINTS.miss;
  }
  if (predH === actualH && predA === actualA) return POINTS.exact;
  if (Math.sign(predH - predA) === Math.sign(actualH - actualA)) return POINTS.result;
  return POINTS.miss;
}

export type MatchResultMeta = { pts: number; label: string; icon: string; bg: string; shadow: string; tint: string };

// predictedDraw distingue, en un partido de penales, al que metió empate del que
// eligió bien al ganador. Ambos valen 3 pero el badge dice cosas distintas.
export function matchResultMeta(pts: number, isPenalty = false, predictedDraw = false): MatchResultMeta {
  if (pts === POINTS.exact) {
    return { pts, label: `Exacto +${POINTS.exact}`, icon: '🎯', bg: 'bg-emerald-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.5)]', tint: 'bg-emerald-500/10 border-emerald-400/30' };
  }
  if (pts === POINTS.result) {
    const label = isPenalty ? (predictedDraw ? `Empate +${POINTS.result}` : `Ganador +${POINTS.result}`) : `Correcto +${POINTS.result}`;
    return { pts, label, icon: '✓', bg: 'bg-blue-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.5)]', tint: 'bg-blue-500/10 border-blue-400/30' };
  }
  return { pts: 0, label: 'Fallaste +0', icon: '✗', bg: 'bg-red-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(239,68,68,0.4)]', tint: 'bg-red-500/10 border-red-400/20' };
}

/** Atajo: puntos + badge de un pronóstico contra el resultado real. */
export function scoreMeta(predH: number, predA: number, actualH: number, actualA: number, penaltyWinner?: PenaltyWinner): MatchResultMeta {
  return matchResultMeta(scoreMatch(predH, predA, actualH, actualA, penaltyWinner), penaltyWinner != null, predH === predA);
}
