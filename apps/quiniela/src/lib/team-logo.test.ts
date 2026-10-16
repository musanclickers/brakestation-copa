import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SPONSOR_LOGO_MAP, resolveTeam } from './team-logo';

// 8 sponsors y cada archivo existe en public/.
assert.equal(Object.keys(SPONSOR_LOGO_MAP).length, 8);
for (const [name, src] of Object.entries(SPONSOR_LOGO_MAP)) {
  assert.ok(fs.existsSync(path.join(process.cwd(), 'public', src)), `falta logo de ${name}: ${src}`);
}

assert.deepEqual(resolveTeam('Exedy', 'Madero Refaccionarias'), {
  name: 'Exedy', sub: 'Madero Refaccionarias', logo: '/images/exedy.svg', darkPlate: false, initials: 'EX',
});

// BRAKE STATION: sin sponsor, o sponsor igual a la refaccionaria → solo el nombre.
const gbs = { name: 'BRAKE STATION', sub: null, logo: '/images/gbs.svg', darkPlate: false, initials: 'BR' };
assert.deepEqual(resolveTeam(null, 'BRAKE STATION'), gbs);
assert.deepEqual(resolveTeam('BRAKE STATION', 'BRAKE STATION'), gbs);
assert.deepEqual(resolveTeam('BRAKE STATION', null), gbs);

assert.equal(resolveTeam('TVA', 'Buenavista Autopartes')!.darkPlate, true);

// Sponsor sin logo → iniciales, sin pedir imagen.
assert.deepEqual(resolveTeam('Aisin', 'Ancona Autopartes'), {
  name: 'Aisin', sub: 'Ancona Autopartes', logo: null, darkPlate: false, initials: 'AI',
});
assert.equal(resolveTeam('C.A.R. +', 'X')!.initials, 'CA');

// Fase final sin asignar.
assert.equal(resolveTeam(null, null), null);

console.log('team-logo: OK');
