// Debe coincidir con el CHECK de packages/db/drizzle/0001_add_user_relacion.sql.
export const RELACIONES = [
  'familiar_jugador',
  'empleado_refaccionaria',
  'amigo_jugador',
  'companero_trabajo',
  'cliente_refaccionaria',
  'otro',
] as const;
export type Relacion = (typeof RELACIONES)[number];

export const RELACION_LABELS: Record<Relacion, string> = {
  familiar_jugador: 'Familiar de jugador',
  empleado_refaccionaria: 'Empleado de refaccionaria',
  amigo_jugador: 'Amigo de jugador',
  companero_trabajo: 'Compañero de trabajo',
  cliente_refaccionaria: 'Cliente de la refaccionaria',
  otro: 'Otro',
};

export const isRelacion = (v: unknown): v is Relacion => RELACIONES.includes(v as Relacion);

export function relacionLabel(relacion: string | null, detalle: string | null): string {
  if (!isRelacion(relacion)) return '—';
  return relacion === 'otro' && detalle ? `Otro (${detalle})` : RELACION_LABELS[relacion];
}
