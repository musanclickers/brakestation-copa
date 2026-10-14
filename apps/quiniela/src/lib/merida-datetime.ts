// Mérida es UTC−6 fijo todo el año (México eliminó el horario de verano en 2022).
// ponytail: offset fijo; revisar solo si México reinstaura DST.
const MERIDA_OFFSET_HOURS = 6;

/** UTC ISO → 'YYYY-MM-DDTHH:mm' como hora de pared Mérida. null → ''. */
export function utcIsoToMeridaInput(utcIso: string | null): string {
  if (!utcIso) return '';
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  // Restar el offset y leer campos UTC = hora de pared Mérida.
  const merida = new Date(d.getTime() - MERIDA_OFFSET_HOURS * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${merida.getUTCFullYear()}-${p(merida.getUTCMonth() + 1)}-${p(merida.getUTCDate())}T${p(merida.getUTCHours())}:${p(merida.getUTCMinutes())}`;
}

/** 'YYYY-MM-DDTHH:mm' (hora de pared Mérida) → UTC ISO. Vacío/ inválido → null. */
export function meridaInputToUtcIso(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  // Hora de pared Mérida + 6h = UTC.
  return new Date(Date.UTC(y, mo - 1, d, h + MERIDA_OFFSET_HOURS, min)).toISOString();
}
