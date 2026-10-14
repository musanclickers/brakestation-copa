import assert from 'node:assert/strict';
import { scoreMatch, matchResultMeta } from './score-match';

// ── Tiempo regular (sin penales): comportamiento histórico intacto ──
assert.equal(scoreMatch(2, 1, 2, 1), 5);            // marcador exacto
assert.equal(scoreMatch(3, 0, 2, 1), 2);            // mismo resultado (local gana)
assert.equal(scoreMatch(0, 0, 0, 0), 5);            // empate exacto
assert.equal(scoreMatch(1, 1, 2, 2), 2);            // empate (mismo signo 0)
assert.equal(scoreMatch(2, 1, 0, 2), 0);            // resultado contrario
assert.equal(scoreMatch(2, 1, 1, 1), 0);            // predijo gana local, fue empate

// ── Penales: 2 pts al que predijo al que avanzó O a cualquier empate ──
// Marcador regular empate 1-1, gana local en penales:
assert.equal(scoreMatch(2, 1, 1, 1, 'home'), 2);    // predijo gana local → acertó ganador
assert.equal(scoreMatch(0, 3, 1, 1, 'home'), 0);    // predijo gana visitante → falló
assert.equal(scoreMatch(1, 1, 1, 1, 'home'), 2);    // predijo empate → acertó resultado regular
assert.equal(scoreMatch(0, 0, 1, 1, 'home'), 2);    // cualquier empate cuenta (0-0)
assert.equal(scoreMatch(1, 2, 1, 1, 'away'), 2);    // predijo gana visitante, avanzó visitante
assert.equal(scoreMatch(2, 2, 2, 2, 'away'), 2);    // predijo empate → 2
// Nunca 5 en penales aunque "clave" el empate exacto:
assert.equal(scoreMatch(1, 1, 1, 1, 'away'), 2);

// ── matchResultMeta ──
assert.equal(matchResultMeta(5).label, 'Exacto +5');
assert.equal(matchResultMeta(2).label, 'Correcto +2');
assert.equal(matchResultMeta(2, true).label, 'Ganador +2');           // penales, predijo ganador
assert.equal(matchResultMeta(2, true, true).label, 'Empate +2');      // penales, predijo empate
assert.equal(matchResultMeta(0).label, 'Fallaste +0');

console.log('score-match: OK');
