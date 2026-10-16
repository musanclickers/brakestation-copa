import { z } from 'zod';
import { RELACIONES } from './relacion';

// Separado de relacion.ts para no meter zod al bundle del form de registro.
// ponytail: strip de tags por regex; React ya escapa al renderizar, esto solo evita guardar HTML.
const stripTags = (s: string) => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

export const RelacionSchema = z
  .object({
    relacion: z.enum(RELACIONES),
    relacion_detalle: z.string().max(100).optional(),
  })
  .transform((d) => ({
    relacion: d.relacion,
    relacion_detalle: d.relacion === 'otro' ? stripTags(d.relacion_detalle ?? '') : null,
  }))
  .refine((d) => d.relacion !== 'otro' || (d.relacion_detalle?.length ?? 0) >= 3, {
    message: 'Si elegiste "Otro", cuéntanos cuál es tu relación.',
    path: ['relacion_detalle'],
  });
