import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { trivias } from '@brakestation/db/schema';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PHASE = ['groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase'] as const;

const Schema = z.object({
  question: z.string().min(1).max(500),
  optionA: z.string().min(1).max(200),
  optionB: z.string().min(1).max(200),
  optionC: z.string().min(1).max(200),
  correctOption: z.enum(['a', 'b', 'c']),
  opensAt: z.string().datetime(),
  closesAt: z.string().datetime(),
  category: z.enum(['futbol', 'marca']),
  phaseLabel: z.enum(PHASE),
});

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;
  if (new Date(d.closesAt) <= new Date(d.opensAt)) {
    return NextResponse.json({ error: 'closes_before_opens' }, { status: 400 });
  }

  const inserted = await db
    .insert(trivias)
    .values({
      question: d.question,
      optionA: d.optionA,
      optionB: d.optionB,
      optionC: d.optionC,
      correctOption: d.correctOption,
      opensAt: new Date(d.opensAt),
      closesAt: new Date(d.closesAt),
      category: d.category,
      phaseLabel: d.phaseLabel,
    })
    .returning({ id: trivias.id });

  return NextResponse.json({ id: inserted[0]!.id });
}
