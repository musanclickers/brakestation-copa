import { db } from '@brakestation/db';
import { matches, adminActions } from '@brakestation/db/schema';
import { getAdminUserId } from '@/lib/admin-auth';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  actual_home_team: z.string().min(1).max(80).optional(),
  actual_away_team: z.string().min(1).max(80).optional(),
  actual_home_score: z.number().int().min(0).max(20).optional(),
  actual_away_score: z.number().int().min(0).max(20).optional(),
  // 'home'/'away' = se definió en penales y avanzó ese lado; null = limpiar.
  penalty_winner: z.enum(['home', 'away']).nullable().optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: matchId } = await params;

  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', details: parsed.error.issues },
      { status: 400 },
    );
  }

  const match = await db.query.matches.findFirst({
    where: eq(matches.id, matchId),
  });
  if (!match) {
    return NextResponse.json({ error: 'match_not_found' }, { status: 404 });
  }

  const beforeState = {
    actual_home_team: match.actualHomeTeam,
    actual_away_team: match.actualAwayTeam,
    actual_home_score: match.actualHomeScore,
    actual_away_score: match.actualAwayScore,
    penalty_winner: match.penaltyWinner,
  };

  const matchStarted = match.scheduledAt <= new Date();
  if (matchStarted && (parsed.data.actual_home_team !== undefined || parsed.data.actual_away_team !== undefined)) {
    return NextResponse.json(
      { error: 'match_started', message: 'No se pueden cambiar equipos después del inicio del partido. Solo se pueden actualizar marcadores.' },
      { status: 409 },
    );
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.actual_home_team !== undefined) updates.actualHomeTeam = parsed.data.actual_home_team;
  if (parsed.data.actual_away_team !== undefined) updates.actualAwayTeam = parsed.data.actual_away_team;
  if (parsed.data.actual_home_score !== undefined) updates.actualHomeScore = parsed.data.actual_home_score;
  if (parsed.data.actual_away_score !== undefined) updates.actualAwayScore = parsed.data.actual_away_score;
  if (parsed.data.penalty_winner !== undefined) updates.penaltyWinner = parsed.data.penalty_winner;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'no_changes' }, { status: 400 });
  }

  await db.update(matches).set(updates).where(eq(matches.id, matchId));

  await db.insert(adminActions).values({
    adminId,
    action: 'update_match',
    targetTable: 'matches',
    targetId: matchId,
    beforeState,
    afterState: parsed.data,
  });

  return NextResponse.json({ ok: true, match_code: match.matchCode });
}
