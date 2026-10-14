import { db } from '@brakestation/db';
import { matches, adminActions } from '@brakestation/db/schema';
import { isMatchLocked, teamName } from '@brakestation/db/phases';
import { eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { FINAL_CODES } from '@/lib/final-phase';

export const dynamic = 'force-dynamic';

const team = z.object({
  sponsor: z.string().trim().max(100).nullable().optional(),
  refaccionaria: z.string().trim().min(1).max(100),
});
const schema = z.object({
  semifinal_1_home: team, // 1° lugar
  semifinal_1_away: team, // 4° lugar
  semifinal_2_home: team, // 2° lugar
  semifinal_2_away: team, // 3° lugar
});

// Asigna los 4 equipos de semifinales al terminar la J7. Los equipos tienen que
// existir en la fase regular (evita typos) y no repetirse. 3er lugar y Gran
// Final se llenan solos al capturar los marcadores de las semis.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', message: 'Faltan equipos por elegir.', details: parsed.error.issues }, { status: 400 });
  }
  const b = parsed.data;

  // Catálogo real de equipos = los que juegan la fase regular.
  const regular = await db.select().from(matches).where(ne(matches.phase, 'final'));
  const known = new Map<string, string | null>();
  for (const m of regular) {
    if (m.refaccionariaHome) known.set(m.refaccionariaHome, m.sponsorHome);
    if (m.refaccionariaAway) known.set(m.refaccionariaAway, m.sponsorAway);
  }

  const picks = [b.semifinal_1_home, b.semifinal_1_away, b.semifinal_2_home, b.semifinal_2_away];
  for (const p of picks) {
    if (!known.has(p.refaccionaria)) {
      return Response.json({ error: 'unknown_team', message: `"${p.refaccionaria}" no es un equipo de la Copa.` }, { status: 400 });
    }
  }
  if (new Set(picks.map((p) => p.refaccionaria)).size !== 4) {
    return Response.json({ error: 'duplicate_team', message: 'Un equipo no puede jugar dos semifinales.' }, { status: 400 });
  }
  // El sponsor sale del catálogo, no del body: así no se puede "inventar" uno.
  const t = (p: { refaccionaria: string }) => ({ sponsor: known.get(p.refaccionaria) ?? null, refaccionaria: p.refaccionaria });

  const assignments = [
    { code: FINAL_CODES.sf1, home: t(b.semifinal_1_home), away: t(b.semifinal_1_away) },
    { code: FINAL_CODES.sf2, home: t(b.semifinal_2_home), away: t(b.semifinal_2_away) },
  ];

  for (const a of assignments) {
    const m = await db.query.matches.findFirst({ where: eq(matches.matchCode, a.code) });
    if (!m) return Response.json({ error: 'match_not_found', message: `No existe el partido ${a.code}. ¿Corriste el seed?` }, { status: 500 });
    if (isMatchLocked(m.startsAt)) {
      return Response.json({ error: 'match_locked', message: `${m.displayLabel} ya cerró pronósticos; no se pueden cambiar sus equipos.` }, { status: 409 });
    }
  }

  await db.transaction(async (tx) => {
    for (const a of assignments) {
      const m = (await tx.select().from(matches).where(eq(matches.matchCode, a.code)))[0]!;
      const next = {
        sponsorHome: a.home.sponsor,
        refaccionariaHome: a.home.refaccionaria,
        sponsorAway: a.away.sponsor,
        refaccionariaAway: a.away.refaccionaria,
      };
      await tx.update(matches).set(next).where(eq(matches.id, m.id));
      await tx.insert(adminActions).values({
        adminId,
        action: 'assign_semifinal',
        targetTable: 'matches',
        targetId: m.id,
        beforeState: { home: teamName(m.sponsorHome, m.refaccionariaHome), away: teamName(m.sponsorAway, m.refaccionariaAway) },
        afterState: next,
      });
    }
  });

  return Response.json({ ok: true });
}
