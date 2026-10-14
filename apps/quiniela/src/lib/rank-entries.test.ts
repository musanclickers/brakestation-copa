import assert from 'node:assert/strict';
import { rankEntries, firstNameInitial } from './rank-entries';

const t = (min: number) => new Date(Date.UTC(2026, 9, 17, 12, min));
const results = new Map([
  ['m1', { h: 2, a: 1, pw: null }],
  ['m2', { h: 1, a: 1, pw: null }],
]);
const names = new Map<string, string | null>([['ana', 'Ana López'], ['beto', 'Beto Ruiz'], ['caro', 'Caro'], ['dani', 'Dani Paz']]);

const ranked = rankEntries(
  [
    // ana: exacto m1 (10) + fallo m2 (0) = 10, 1 exacto
    { userId: 'ana', matchId: 'm1', h: 2, a: 1, submittedAt: t(5) },
    { userId: 'ana', matchId: 'm2', h: 2, a: 0, submittedAt: t(5) },
    // beto: resultado m1 (3) + resultado m2 (3) = 6
    { userId: 'beto', matchId: 'm1', h: 3, a: 0, submittedAt: t(1) },
    { userId: 'beto', matchId: 'm2', h: 0, a: 0, submittedAt: t(1) },
    // caro: exacto m2 (10) = 10, 1 exacto, guardó antes que ana → gana el desempate
    { userId: 'caro', matchId: 'm2', h: 1, a: 1, submittedAt: t(2) },
    // dani: solo un pronóstico de un partido sin resultado → 0 pts, sí aparece
    { userId: 'dani', matchId: 'm3', h: 0, a: 0, submittedAt: t(0) },
  ],
  results,
  names,
);

assert.deepEqual(ranked.map((r) => r.userId), ['caro', 'ana', 'beto', 'dani']);
assert.equal(ranked[0]!.totalPoints, 10);
assert.equal(ranked[1]!.exactHits, 1);
assert.equal(ranked[2]!.resultHits, 2);
assert.equal(ranked[1]!.name, 'Ana L.');

// Exacto (10) queda arriba de resultado (3) aunque haya guardado después:
const r2 = rankEntries(
  [
    { userId: 'x', matchId: 'm1', h: 2, a: 1, submittedAt: t(9) }, // 10, 1 exacto
    { userId: 'y', matchId: 'm1', h: 3, a: 2, submittedAt: t(0) }, // 3
  ],
  results,
  new Map(),
);
assert.deepEqual(r2.map((r) => r.userId), ['x', 'y']);

assert.equal(firstNameInitial('luis martínez'), 'luis M.');
assert.equal(firstNameInitial('  Caro  '), 'Caro');

console.log('rank-entries: OK');
