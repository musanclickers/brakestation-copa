import assert from 'node:assert/strict';
import { RELACIONES, RELACION_LABELS, relacionLabel } from './relacion';
import { RelacionSchema } from './relacion-schema';

// Cada valor del enum es válido y tiene label legible.
for (const r of RELACIONES) {
  const ok = RelacionSchema.safeParse({ relacion: r, relacion_detalle: r === 'otro' ? 'Proveedor' : undefined });
  assert.ok(ok.success, `debería aceptar ${r}`);
  assert.ok(RELACION_LABELS[r]);
}

assert.equal(RelacionSchema.safeParse({ relacion: 'hacker' }).success, false);
assert.equal(RelacionSchema.safeParse({}).success, false);

// "otro" exige detalle de 3+ caracteres después de trim y strip.
assert.equal(RelacionSchema.safeParse({ relacion: 'otro' }).success, false);
assert.equal(RelacionSchema.safeParse({ relacion: 'otro', relacion_detalle: '  ab  ' }).success, false);
assert.equal(RelacionSchema.safeParse({ relacion: 'otro', relacion_detalle: '<b></b>' }).success, false);
assert.equal(RelacionSchema.safeParse({ relacion: 'otro', relacion_detalle: 'x'.repeat(101) }).success, false);

// Sanitiza: quita tags y espacios.
const s = RelacionSchema.parse({ relacion: 'otro', relacion_detalle: '  <script>alert(1)</script>Proveedor <i>GBS</i> ' });
assert.equal(s.relacion_detalle, 'alert(1)Proveedor GBS');

// Si no es "otro", el detalle se descarta.
assert.equal(RelacionSchema.parse({ relacion: 'amigo_jugador', relacion_detalle: 'algo' }).relacion_detalle, null);

// Label para admin.
assert.equal(relacionLabel('otro', 'Administrador de sistema GBS'), 'Otro (Administrador de sistema GBS)');
assert.equal(relacionLabel('familiar_jugador', null), 'Familiar de jugador');
assert.equal(relacionLabel(null, null), '—');

console.log('relacion: ok');
