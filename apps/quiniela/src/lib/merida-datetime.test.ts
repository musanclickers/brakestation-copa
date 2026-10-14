import assert from 'node:assert/strict';
import { utcIsoToCdmxInput, cdmxInputToUtcIso } from './cdmx-datetime';

// 27 jun 21:00 CDMX === 28 jun 03:00 UTC
assert.equal(cdmxInputToUtcIso('2026-06-27T21:00'), '2026-06-28T03:00:00.000Z');

// Round-trip
assert.equal(utcIsoToCdmxInput('2026-06-28T03:00:00.000Z'), '2026-06-27T21:00');

// Vacío / null
assert.equal(cdmxInputToUtcIso(''), null);
assert.equal(utcIsoToCdmxInput(null), '');

// Formato inválido → null
assert.equal(cdmxInputToUtcIso('no-es-fecha'), null);

console.log('cdmx-datetime: OK');
