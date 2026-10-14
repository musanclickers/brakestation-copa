// CDMX es UTC−6 fijo todo el año (México eliminó el horario de verano en 2022).
// ponytail: offset fijo; revisar solo si México reinstaura DST.
const CDMX_OFFSET_HOURS = 6;

/** UTC ISO → 'YYYY-MM-DDTHH:mm' como hora de pared CDMX. null → ''. */
export function utcIsoToCdmxInput(utcIso: string | null): string {
  if (!utcIso) return '';
  const d = new Date(utcIso);
  if (Number.isNaN(d.getTime())) return '';
  // Restar el offset y leer campos UTC = hora de pared CDMX.
  const cdmx = new Date(d.getTime() - CDMX_OFFSET_HOURS * 3_600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${cdmx.getUTCFullYear()}-${p(cdmx.getUTCMonth() + 1)}-${p(cdmx.getUTCDate())}T${p(cdmx.getUTCHours())}:${p(cdmx.getUTCMinutes())}`;
}

/** 'YYYY-MM-DDTHH:mm' (hora de pared CDMX) → UTC ISO. Vacío/ inválido → null. */
export function cdmxInputToUtcIso(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const h = Number(m[4]);
  const min = Number(m[5]);
  // Hora de pared CDMX + 6h = UTC.
  return new Date(Date.UTC(y, mo - 1, d, h + CDMX_OFFSET_HOURS, min)).toISOString();
}
