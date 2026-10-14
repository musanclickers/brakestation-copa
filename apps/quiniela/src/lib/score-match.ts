// Única fuente de verdad del scoring de partidos. Antes vivía duplicada en
// compute-ranking, dashboard, verifica y PhaseForm.
//
// Reglas:
//  - Tiempo regular/extra (penaltyWinner null): 5 pts marcador exacto, 2 pts
//    acertar el resultado (mismo signo), 0 si no.
//  - Penales (penaltyWinner 'home'|'away'): el marcador regular fue empate. Se
//    dan 2 pts a DOS perfiles: (a) quien predijo al equipo que avanzó (eligió
//    bien al ganador) y (b) quien predijo CUALQUIER empate (atinó al resultado
//    del tiempo regular aunque no al ganador). Nunca 5. Predijo al que perdió = 0.
//    El candado de eliminatoria (r32+) ya no deja capturar empates nuevos; este
//    caso (b) cubre a los que alcanzaron a meter empate antes del candado.

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
    if (predWinner === null) return 2; // predijo empate = acertó el resultado del tiempo regular
    return predWinner === penaltyWinner ? 2 : 0;
  }
  if (predH === actualH && predA === actualA) return 5;
  if (Math.sign(predH - predA) === Math.sign(actualH - actualA)) return 2;
  return 0;
}

export type MatchResultMeta = { pts: number; label: string; icon: string; bg: string; shadow: string };

// predictedDraw distingue, en un partido de penales, al que metió empate (atinó
// al resultado regular) del que eligió bien al ganador. Ambos valen 2 pero el
// badge debe decir cosas distintas.
export function matchResultMeta(pts: number, isPenalty = false, predictedDraw = false): MatchResultMeta {
  if (pts === 5) return { pts, label: 'Exacto +5', icon: '🎯', bg: 'bg-emerald-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(16,185,129,0.5)]' };
  if (pts === 2) {
    const label = isPenalty ? (predictedDraw ? 'Empate +2' : 'Ganador +2') : 'Correcto +2';
    return { pts, label, icon: '✓', bg: 'bg-blue-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(59,130,246,0.5)]' };
  }
  return { pts: 0, label: 'Fallaste +0', icon: '✗', bg: 'bg-red-500 text-white', shadow: 'shadow-[0_4px_20px_rgba(239,68,68,0.4)]' };
}
