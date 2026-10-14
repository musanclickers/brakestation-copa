// Lockout server-side: 15 min antes de cada partido. Correr: tsx src/lib/phases.test.ts
import assert from 'node:assert/strict';
import { lockoutAt, isMatchLocked, isMatchOpen, teamName, LOCKOUT_MINUTES } from '@brakestation/db/phases';

const kickoff = new Date('2026-10-17T23:00:00Z'); // J1-01: sáb 17 oct 17:00 Mérida
const at = (iso: string) => new Date(iso);

assert.equal(LOCKOUT_MINUTES, 15);
assert.equal(lockoutAt(kickoff).toISOString(), '2026-10-17T22:45:00.000Z'); // 16:45 Mérida

assert.equal(isMatchLocked(kickoff, at('2026-10-17T22:44:59Z')), false); // 1 s antes: abierto
assert.equal(isMatchLocked(kickoff, at('2026-10-17T22:45:00Z')), true);  // justo en el lockout: cerrado
assert.equal(isMatchLocked(kickoff, at('2026-10-17T23:30:00Z')), true);  // ya empezó
assert.equal(isMatchLocked(kickoff.toISOString(), at('2026-10-17T22:00:00Z')), false); // acepta string

const teams = { sponsorHome: 'Cana Brake', refaccionariaHome: 'Ancona Autopartes', sponsorAway: null, refaccionariaAway: 'BRAKE STATION' };
assert.equal(isMatchOpen({ ...teams, startsAt: kickoff }, at('2026-10-17T20:00:00Z')), true);
assert.equal(isMatchOpen({ ...teams, startsAt: kickoff }, at('2026-10-17T22:50:00Z')), false);
// Fase final sin equipos asignados: nunca abierto aunque falte mucho
assert.equal(isMatchOpen({ sponsorHome: null, refaccionariaHome: null, sponsorAway: null, refaccionariaAway: null, startsAt: kickoff }, at('2026-10-01T00:00:00Z')), false);

assert.equal(teamName('Cana Brake', 'Ancona Autopartes'), 'Cana Brake · Ancona Autopartes');
assert.equal(teamName(null, 'BRAKE STATION'), 'BRAKE STATION');
assert.equal(teamName('SEIRE', 'EL FARO · Grupo Automotriz'), 'SEIRE · EL FARO · Grupo Automotriz');
assert.equal(teamName(null, null), null);

console.log('phases (lockout): OK');
