import assert from 'node:assert/strict';
import { utcIsoToMeridaInput, meridaInputToUtcIso } from './merida-datetime';

// J1: sáb 17 oct 17:00 Mérida === 23:00 UTC
assert.equal(meridaInputToUtcIso('2026-10-17T17:00'), '2026-10-17T23:00:00.000Z');
assert.equal(meridaInputToUtcIso('2026-06-27T21:00'), '2026-06-28T03:00:00.000Z');

// Round-trip
assert.equal(utcIsoToMeridaInput('2026-06-28T03:00:00.000Z'), '2026-06-27T21:00');

// Vacío / null
assert.equal(meridaInputToUtcIso(''), null);
assert.equal(utcIsoToMeridaInput(null), '');

// Formato inválido → null
assert.equal(meridaInputToUtcIso('no-es-fecha'), null);

console.log('merida-datetime: OK');
