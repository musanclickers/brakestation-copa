// Sin imports de DB: módulo puro, testeable con tsx.
export const BRACKET_ROUNDS = [
  { phase: 'r32', label: 'Dieciseisavos' },
  { phase: 'r16', label: 'Octavos' },
  { phase: 'qf', label: 'Cuartos' },
  { phase: 'sf', label: 'Semifinales' },
  { phase: 'final_phase', label: 'Final' },
] as const;

export type BracketMatch = {
  id: string;
  matchCode: string;
  phase: string;
  homeTeam: string | null; // null = "Por definir"
  awayTeam: string | null;
  startsAt: string | null;
  venueName: string | null;
};

// Orden VISUAL del bracket = posición en el árbol. Se indexa por el SLOT = sufijo
// del match_code (WCM-<fase>-NNN), que es FIJO y no cambia si un admin corrige la
// hora de un partido. (No usar startsAt: editar una fecha reordenaría el cuadro.)
// El árbol real cruza R16-001 = ganador(R32-001) vs ganador(R32-004), etc.; esos
// pares no son contiguos por número de slot, así que este arreglo los recoloca
// contiguos para que las líneas conectoras cuadren con el bracket oficial
// (verificado equipo a equipo contra el cuadro de Google del Mundial 2026).
// ponytail: cuadro fijo del torneo; si FIFA reordenara el calendario, reverificar.
const BRACKET_SLOT_ORDER: Record<string, number[]> = {
  // R16-001←R32(1,4) · 002←(3,6) · 003←(9,10) · 004←(11,12)
  // 005←(2,5) · 006←(7,8) · 007←(13,16) · 008←(14,15)
  r32: [1, 4, 3, 6, 9, 10, 11, 12, 2, 5, 7, 8, 13, 16, 14, 15],
  r16: [1, 2, 3, 4, 5, 6, 7, 8],
  qf: [1, 2, 3, 4],
  sf: [1, 2],
  final_phase: [1],
};

function slotNumber(matchCode: string): number {
  const m = matchCode.match(/(\d+)$/);
  return m ? parseInt(m[1]!, 10) : 0;
}

/**
 * Agrupa los partidos en rondas ordenadas, y DENTRO de cada ronda los reordena a
 * su posición en el árbol del bracket (BRACKET_SLOT_ORDER), por SLOT (sufijo del
 * match_code), NO por fecha. Así los pares contiguos (i, i+1) alimentan el mismo
 * cruce de la ronda siguiente y las líneas conectoras de BracketView cuadran con
 * el cuadro oficial, sin importar que se editen horas. Solo reordena si la ronda
 * tiene exactamente los slots esperados; si no, deja el orden de entrada.
 */
export function buildBracket(matches: BracketMatch[]) {
  return BRACKET_ROUNDS.map((r) => {
    const inRound = matches.filter((m) => m.phase === r.phase);
    const order = BRACKET_SLOT_ORDER[r.phase];
    const bySlot = new Map(inRound.map((m) => [slotNumber(m.matchCode), m]));
    const matchesOrdered =
      order && order.every((slot) => bySlot.has(slot))
        ? order.map((slot) => bySlot.get(slot)!)
        : inRound;
    return { phase: r.phase, label: r.label, matches: matchesOrdered };
  });
}
