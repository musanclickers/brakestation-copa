import { db } from '@brakestation/db';
import { matches, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { populateFinals, FINAL_CODES } from '@/lib/final-phase';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  actual_home_score: z.number().int().min(0).max(20).optional(),
  actual_away_score: z.number().int().min(0).max(20).optional(),
  // 'home'/'away' = se definió en serie de penales y ganó ese lado; null = no hubo.
  penalty_winner: z.enum(['home', 'away']).nullable().optional(),
  starts_at: z.string().datetime().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  const { id } = await params;
  const parsed = PatchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', message: 'Datos inválidos', details: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const match = await db.query.matches.findFirst({ where: eq(matches.id, id) });
  if (!match) return NextResponse.json({ error: 'match_not_found' }, { status: 404 });

  const updates: Partial<typeof matches.$inferInsert> = {};
  if (d.actual_home_score !== undefined || d.actual_away_score !== undefined) {
    if (d.actual_home_score === undefined || d.actual_away_score === undefined) {
      return NextResponse.json({ error: 'validation', message: 'Captura los dos marcadores.' }, { status: 400 });
    }
    if (!match.refaccionariaHome || !match.refaccionariaAway) {
      return NextResponse.json({ error: 'teams_not_loaded', message: 'Este partido todavía no tiene equipos.' }, { status: 409 });
    }
    const draw = d.actual_home_score === d.actual_away_score;
    const pw = d.penalty_winner ?? null;
    if (match.phase === 'final' && draw && !pw) {
      return NextResponse.json({ error: 'penalty_required', message: 'En la Fase Final un empate se define en penales: indica quién ganó.' }, { status: 400 });
    }
    if (pw && (!draw || match.phase !== 'final')) {
      return NextResponse.json({ error: 'validation', message: 'Solo hay serie de penales en un empate de Fase Final.' }, { status: 400 });
    }
    updates.actualHomeScore = d.actual_home_score;
    updates.actualAwayScore = d.actual_away_score;
    updates.penaltyWinner = pw;
  }
  if (d.starts_at) updates.startsAt = new Date(d.starts_at);

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_changes', message: 'No hay cambios.' }, { status: 400 });
  }

  await db.update(matches).set(updates).where(eq(matches.id, id));
  await db.insert(adminActions).values({
    adminId,
    action: 'update_match',
    targetTable: 'matches',
    targetId: id,
    beforeState: {
      actual_home_score: match.actualHomeScore,
      actual_away_score: match.actualAwayScore,
      penalty_winner: match.penaltyWinner,
      starts_at: match.startsAt.toISOString(),
    },
    afterState: d,
  });

  const isSemi = match.matchCode === FINAL_CODES.sf1 || match.matchCode === FINAL_CODES.sf2;
  const populated = isSemi ? await populateFinals(adminId) : [];

  return NextResponse.json({ ok: true, match_code: match.matchCode, populated });
}
