import assert from 'node:assert/strict';
import { computeStandings, standingsProgress } from './standings';

const m = (home: string, away: string, h: number | null, a: number | null, phase = 'j1') => ({
  phase,
  home,
  away,
  actualHomeScore: h,
  actualAwayScore: a,
});
const teams = (...names: string[]) => names.map((name) => ({ name }));
const order = (rows: { name: string }[]) => rows.map((r) => r.name);

// 3/1/0: A gana a B y empata con C.
{
  const rows = computeStandings(teams('A', 'B', 'C'), [m('A', 'B', 2, 0), m('C', 'A', 1, 1)]);
  assert.deepEqual(order(rows), ['A', 'C', 'B']);
  assert.deepEqual(
    rows[0],
    { name: 'A', pj: 2, g: 1, e: 1, p: 0, gf: 3, gc: 1, dg: 2, pts: 4, tecnico: false },
  );
  assert.equal(rows[1]!.pts, 1);
  assert.equal(rows[2]!.pts, 0);
  assert.equal(rows[2]!.dg, -2);
}

// Desempate 1: diferencia de goles (Zeta +2 con 2 GF vs Alfa +1 con 4 GF, ambos 3 pts).
assert.deepEqual(
  order(computeStandings(teams('Alfa', 'Zeta', 'C', 'D'), [m('Zeta', 'C', 2, 0), m('Alfa', 'D', 4, 3)])).slice(0, 2),
  ['Zeta', 'Alfa'],
);

// Desempate 2: goles a favor (misma DG +1; Zeta 3 GF vs Alfa 1 GF).
assert.deepEqual(
  order(computeStandings(teams('Alfa', 'Zeta', 'C', 'D'), [m('Zeta', 'C', 3, 2), m('Alfa', 'D', 1, 0)])).slice(0, 2),
  ['Zeta', 'Alfa'],
);

// Desempate 3: resultado directo, dos equipos (Zeta le ganó a Alfa; ambos 3 pts, DG 0, GF 1).
{
  const rows = computeStandings(teams('Alfa', 'Zeta', 'C', 'D'), [m('Zeta', 'Alfa', 1, 0), m('D', 'Zeta', 1, 0), m('Alfa', 'C', 1, 0)]);
  assert.deepEqual(order(rows), ['D', 'Zeta', 'Alfa', 'C']);
  assert.equal(rows[1]!.tecnico, false);
}

// Triple empate (6 pts, DG +1, GF 2) resuelto por puntos en directo: Zeta 4, Mu 3, Alfa 1.
{
  const rows = computeStandings(teams('Alfa', 'Mu', 'Zeta', 'D', 'E', 'F', 'G'), [
    m('Zeta', 'Mu', 1, 0), m('Zeta', 'Alfa', 0, 0), m('Mu', 'Alfa', 1, 0),
    m('Zeta', 'D', 1, 1), m('Zeta', 'E', 0, 0),
    m('Mu', 'F', 1, 0),
    m('Alfa', 'G', 2, 0), m('Alfa', 'D', 0, 0), m('Alfa', 'E', 0, 0),
  ]);
  assert.deepEqual(order(rows).slice(0, 3), ['Zeta', 'Mu', 'Alfa']);
  assert.ok(rows.slice(0, 3).every((r) => r.pts === 6 && r.dg === 1 && r.gf === 2));
}

// Triple empate circular (6 pts, DG +3, GF 6), mismos puntos en directo → DG en directo: Zeta +2, Mu 0, Alfa -2.
{
  const rows = computeStandings(teams('Alfa', 'Mu', 'Zeta', 'D', 'E', 'F'), [
    m('Zeta', 'Alfa', 3, 0), m('Alfa', 'Mu', 1, 0), m('Mu', 'Zeta', 1, 0),
    m('Zeta', 'D', 3, 2), m('Alfa', 'E', 5, 0), m('Mu', 'F', 5, 2),
  ]);
  assert.deepEqual(order(rows).slice(0, 3), ['Zeta', 'Mu', 'Alfa']);
  assert.ok(rows.slice(0, 3).every((r) => r.pts === 6 && r.dg === 3 && r.gf === 6 && !r.tecnico));
}

// Desempate 4: empate técnico → orden alfabético en español (Ébano antes que Fénix) con bandera.
{
  const rows = computeStandings(teams('Fénix', 'Ébano'), [m('Fénix', 'Ébano', 1, 1)]);
  assert.deepEqual(order(rows), ['Ébano', 'Fénix']);
  assert.ok(rows.every((r) => r.tecnico));
}

// Equipos sin partidos jugados: aparecen en ceros y sin bandera de empate técnico.
{
  const rows = computeStandings(teams('Zeta', 'Beta', 'Alfa'), [m('Zeta', 'Alfa', 0, 1)]);
  assert.deepEqual(order(rows), ['Alfa', 'Beta', 'Zeta']);
  assert.deepEqual(
    rows[1],
    { name: 'Beta', pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, dg: 0, pts: 0, tecnico: false },
  );
}
assert.ok(computeStandings(teams('B', 'A'), []).every((r) => r.pj === 0 && !r.tecnico));

// Partidos sin resultado final no cuentan.
{
  const rows = computeStandings(teams('A', 'B'), [m('A', 'B', null, null), m('B', 'A', 2, null)]);
  assert.ok(rows.every((r) => r.pj === 0 && r.pts === 0));
}

// Los campos extra del equipo (logo/nombre) se conservan en la fila.
assert.equal(computeStandings([{ name: 'A', sponsor: 'X' }], [])[0]!.sponsor, 'X');

// Subtítulo: última jornada con al menos un resultado y cuántos partidos le faltan.
assert.equal(standingsProgress([m('A', 'B', null, null)]), null);
assert.deepEqual(standingsProgress([m('A', 'B', 1, 0), m('C', 'D', 2, 2), m('A', 'C', null, null, 'j2')]), { jornada: 1, pending: 0 });
assert.deepEqual(
  standingsProgress([m('A', 'B', null, null), m('A', 'C', 1, 0, 'j2'), m('B', 'D', null, null, 'j2')]),
  { jornada: 2, pending: 1 },
);

console.log('standings: OK');
