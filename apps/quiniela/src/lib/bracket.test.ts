// Self-check del orden del bracket. Correr: tsx src/lib/bracket.test.ts
import assert from 'node:assert/strict';
import { buildBracket, type BracketMatch } from './bracket';

// El slot sale del match_code (WCM-<fase>-NNN). El startsAt se pone INVERTIDO a
// propósito (más tarde = slot más bajo) para probar que la fecha NO afecta el
// orden del bracket: editar una hora no debe reordenar el cuadro.
function mk(phase: string, n: number): BracketMatch {
  const inv = String(28 - n).padStart(2, '0'); // fecha al revés del slot
  return {
    id: `${phase}-${n}`,
    matchCode: `WCM-${phase.toUpperCase()}-${String(n).padStart(3, '0')}`,
    phase,
    homeTeam: null,
    awayTeam: null,
    startsAt: `2026-07-${inv}T12:00:00.000Z`,
    venueName: null,
  };
}

// Entrada DESORDENADA (rondas en reversa) para probar que el orden lo fija el
// slot del código, no el orden de entrada ni la fecha.
const fixture: BracketMatch[] = [
  ...Array.from({ length: 16 }, (_, i) => mk('r32', 16 - i)),
  ...Array.from({ length: 8 }, (_, i) => mk('r16', 8 - i)),
  ...Array.from({ length: 4 }, (_, i) => mk('qf', 4 - i)),
  ...Array.from({ length: 2 }, (_, i) => mk('sf', 2 - i)),
  mk('final_phase', 1),
];

const rounds = buildBracket(fixture);
// El slot real = sufijo del match_code. Lo extraemos para verificar el orden.
const slots = (phase: string) =>
  rounds.find((r) => r.phase === phase)!.matches.map((m) => parseInt(m.matchCode.match(/(\d+)$/)![1]!, 10));

assert.deepEqual(rounds.map((r) => r.phase), ['r32', 'r16', 'qf', 'sf', 'final_phase']);
assert.deepEqual(rounds.map((r) => r.matches.length), [16, 8, 4, 2, 1]);

// Orden de árbol real (verificado contra Google). Octavos ya van 1..8; los
// dieciseisavos se reordenan para que cada par de R32 quede contiguo.
assert.deepEqual(slots('r16'), [1, 2, 3, 4, 5, 6, 7, 8], 'orden R16 incorrecto');
assert.deepEqual(slots('r32'), [1, 4, 3, 6, 9, 10, 11, 12, 2, 5, 7, 8, 13, 16, 14, 15], 'orden R32 incorrecto');
assert.deepEqual(slots('qf'), [1, 2, 3, 4], 'orden QF incorrecto');

// Cada par contiguo de R32 alimenta el mismo octavo (R16-001←R32 1,4 ; etc.).
const o32 = slots('r32');
assert.deepEqual(
  [[o32[0], o32[1]], [o32[2], o32[3]], [o32[8], o32[9]]],
  [[1, 4], [3, 6], [2, 5]],
  'pares R32->R16 mal emparejados',
);

console.log('bracket: OK (Dieciseisavos =', o32.join(','), ')');
