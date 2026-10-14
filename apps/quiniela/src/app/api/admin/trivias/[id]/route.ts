import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { trivias, triviaResponses } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PHASE = ['groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase'] as const;

const PatchSchema = z.object({
  question: z.string().min(1).max(500).optional(),
  optionA: z.string().min(1).max(200).optional(),
  optionB: z.string().min(1).max(200).optional(),
  optionC: z.string().min(1).max(200).optional(),
  correctOption: z.enum(['a', 'b', 'c']).optional(),
  opensAt: z.string().datetime().optional(),
  closesAt: z.string().datetime().optional(),
  category: z.enum(['futbol', 'marca']).optional(),
  phaseLabel: z.enum(PHASE).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  if (d.opensAt && d.closesAt && new Date(d.closesAt) <= new Date(d.opensAt)) {
    return NextResponse.json({ error: 'closes_before_opens' }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (d.question !== undefined) update.question = d.question;
  if (d.optionA !== undefined) update.optionA = d.optionA;
  if (d.optionB !== undefined) update.optionB = d.optionB;
  if (d.optionC !== undefined) update.optionC = d.optionC;
  if (d.correctOption !== undefined) update.correctOption = d.correctOption;
  if (d.opensAt !== undefined) update.opensAt = new Date(d.opensAt);
  if (d.closesAt !== undefined) update.closesAt = new Date(d.closesAt);
  if (d.category !== undefined) update.category = d.category;
  if (d.phaseLabel !== undefined) update.phaseLabel = d.phaseLabel;

  await db.update(trivias).set(update).where(eq(trivias.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const hasResponses = await db
    .select({ id: triviaResponses.id })
    .from(triviaResponses)
    .where(eq(triviaResponses.triviaId, id))
    .limit(1);
  if (hasResponses.length > 0) {
    return NextResponse.json(
      { error: 'has_responses', hint: 'use_close_endpoint_instead' },
      { status: 409 },
    );
  }

  await db.delete(trivias).where(eq(trivias.id, id));
  return NextResponse.json({ ok: true });
}
