import assert from 'node:assert/strict';
import { phaseLockoutAt, isPhaseLocked, isMatchOpen } from '@brakestation/db/lockout';

const at = (iso: string) => new Date(iso);
const team = { sponsorHome: 'Cana Brake', refaccionariaHome: 'Ancona', sponsorAway: 'SEIRE', refaccionariaAway: 'EL FARO' };
const none = { sponsorHome: null, refaccionariaHome: null, sponsorAway: null, refaccionariaAway: null };

// J1 real: sáb 17:00 Mérida (23:00Z) es el primero; los demás después y desordenados.
const j1 = [
  { ...team, phase: 'j1', startsAt: at('2026-10-18T15:00:00Z') },
  { ...team, phase: 'j1', startsAt: at('2026-10-17T23:00:00Z') },
  { ...team, phase: 'j1', startsAt: '2026-10-18T16:00:00.000Z' }, // acepta string (SerializedMatch)
  { ...team, phase: 'j1', startsAt: at('2026-10-18T00:00:00Z') },
];

assert.equal(phaseLockoutAt(j1)!.toISOString(), '2026-10-17T22:45:00.000Z'); // sáb 16:45 Mérida
assert.equal(phaseLockoutAt([j1[0]!])!.toISOString(), '2026-10-18T14:45:00.000Z');
assert.equal(phaseLockoutAt([]), null);

assert.equal(isPhaseLocked(j1, at('2026-10-17T12:00:00Z')), false);
assert.equal(isPhaseLocked(j1, at('2026-10-17T22:44:00Z')), false); // 1 min antes
assert.equal(isPhaseLocked(j1, at('2026-10-17T22:44:59Z')), false); // 1 s antes
assert.equal(isPhaseLocked(j1, at('2026-10-17T22:45:00Z')), true); // justo en el cierre
assert.equal(isPhaseLocked(j1, at('2026-10-18T10:00:00Z')), true);
assert.equal(isPhaseLocked([], at('2026-10-17T12:00:00Z')), true); // nada que pronosticar

// Partido tardío (J1-04, dom 10:00): editable mientras la jornada siga abierta, cerrado junto con los demás.
const late = j1[2]!;
assert.equal(isMatchOpen(late, j1, at('2026-10-17T22:00:00Z')), true);
assert.equal(isMatchOpen(late, j1, at('2026-10-17T22:45:00Z')), false);

// Fase Final: 3er lugar / Gran Final "Por definir" se pronostican cuando ya hay semis asignadas.
const sf1 = { ...team, phase: 'final', startsAt: at('2026-12-05T23:00:00Z') };
const sf2 = { ...team, phase: 'final', startsAt: at('2026-12-06T00:00:00Z') };
const tercer = { ...none, phase: 'final', startsAt: at('2026-12-06T15:00:00Z') };
const gran = { ...none, phase: 'final', startsAt: at('2026-12-06T16:00:00Z') };
const final = [sf1, sf2, tercer, gran];
const before = at('2026-12-01T00:00:00Z');
assert.equal(phaseLockoutAt(final)!.toISOString(), '2026-12-05T22:45:00.000Z'); // sáb 5 dic 16:45 Mérida
assert.equal(isMatchOpen(tercer, final, before), true);
assert.equal(isMatchOpen(gran, final, before), true);
assert.equal(isMatchOpen(gran, final, at('2026-12-05T22:45:00Z')), false);

// Sin semis asignadas (antes de que acabe J7): nada de la final abre.
const unassigned = final.map((m) => ({ ...m, ...none }));
assert.equal(isMatchOpen(unassigned[0]!, unassigned, before), false);
assert.equal(isMatchOpen(unassigned[3]!, unassigned, before), false);

// Fase regular sin equipos: no se pronostica.
const j2 = [{ ...none, phase: 'j2', startsAt: at('2026-10-24T23:00:00Z') }];
assert.equal(isMatchOpen(j2[0]!, j2, before), false);

console.log('lockout: OK');
