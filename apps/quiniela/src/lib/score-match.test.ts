import assert from 'node:assert/strict';
import { scoreMatch, matchResultMeta, scoreMeta } from './score-match';

// ── Tiempo regular: 10 exacto / 3 resultado / 0 fallo ──
assert.equal(scoreMatch(2, 1, 2, 1), 10);           // marcador exacto
assert.equal(scoreMatch(3, 0, 2, 1), 3);            // mismo resultado (local gana)
assert.equal(scoreMatch(0, 2, 1, 3), 3);            // mismo resultado (visitante gana)
assert.equal(scoreMatch(0, 0, 0, 0), 10);           // empate exacto
assert.equal(scoreMatch(2, 2, 1, 1), 3);            // bug reportado en el Mundial: empate 2-2 vs real 1-1 → 3
assert.equal(scoreMatch(1, 1, 2, 2), 3);            // empate (mismo signo 0)
assert.equal(scoreMatch(2, 1, 0, 2), 0);            // resultado contrario
assert.equal(scoreMatch(2, 1, 1, 1), 0);            // predijo gana local, fue empate
assert.equal(scoreMatch(1, 1, 2, 1), 0);            // predijo empate, ganó local

// ── Penales (Fase Final): 3 al que predijo al que avanzó o cualquier empate ──
assert.equal(scoreMatch(2, 1, 1, 1, 'home'), 3);    // predijo gana local → acertó ganador
assert.equal(scoreMatch(0, 3, 1, 1, 'home'), 0);    // predijo gana visitante → falló
assert.equal(scoreMatch(1, 1, 1, 1, 'home'), 3);    // predijo empate
assert.equal(scoreMatch(1, 2, 1, 1, 'away'), 3);    // predijo gana visitante, avanzó visitante
assert.equal(scoreMatch(1, 1, 1, 1, 'away'), 3);    // nunca 10 en penales

// ── Badges ──
assert.equal(matchResultMeta(10).label, 'Exacto +10');
assert.equal(matchResultMeta(3).label, 'Correcto +3');
assert.equal(matchResultMeta(3, true).label, 'Ganador +3');
assert.equal(matchResultMeta(3, true, true).label, 'Empate +3');
assert.equal(matchResultMeta(0).label, 'Fallaste +0');
assert.equal(scoreMeta(2, 2, 1, 1).label, 'Correcto +3');
assert.equal(scoreMeta(3, 1, 1, 1, 'home').label, 'Ganador +3');

console.log('score-match: OK');
