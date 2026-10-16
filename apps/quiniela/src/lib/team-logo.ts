// Logos en public/images/. Las llaves son el sponsor tal como viene del seed.
export const SPONSOR_LOGO_MAP: Record<string, string> = {
  'Cana Brake': '/images/canabrake.svg',
  SEIRE: '/images/seire.png',
  TVA: '/images/tva.png',
  Platinum: '/images/platinum.png', // el .svg original pesa 676 KB
  'Golden Friction': '/images/golden-friction.svg',
  Exedy: '/images/exedy.svg',
  'C.A.R. +': '/images/carplus.png',
  'BRAKE STATION': '/images/gbs.svg',
};

// Logos blancos (pensados para fondo oscuro): sobre la placa blanca se pierden.
const DARK_PLATE = new Set(['TVA']);

export type ResolvedTeam = { name: string; sub: string | null; logo: string | null; darkPlate: boolean; initials: string };

/** null = equipo por definir (fase final sin asignar). */
export function resolveTeam(sponsor: string | null, refaccionaria: string | null): ResolvedTeam | null {
  // Sin sponsor propio (BRAKE STATION): la refaccionaria hace de sponsor.
  const solo = !sponsor || !refaccionaria || sponsor === refaccionaria;
  const name = sponsor || refaccionaria;
  if (!name) return null;
  return {
    name,
    sub: solo ? null : refaccionaria,
    logo: SPONSOR_LOGO_MAP[name] ?? null,
    darkPlate: DARK_PLATE.has(name),
    initials: name.replace(/[^\p{L}\p{N}]/gu, '').slice(0, 2).toUpperCase(),
  };
}
