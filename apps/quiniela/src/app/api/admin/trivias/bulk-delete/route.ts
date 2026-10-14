import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { auditLog, trivias, triviaResponses } from '@brakestation/db/schema';
import { and, inArray, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  mode: z.enum(['auto', 'delete', 'close', 'force']).optional().default('auto'),
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
  const { ids, mode } = parsed.data;

  const counts = await db
    .select({ triviaId: triviaResponses.triviaId, n: sql<number>`count(*)::int` })
    .from(triviaResponses)
    .where(inArray(triviaResponses.triviaId, ids))
    .groupBy(triviaResponses.triviaId);
  const withResponses = new Set(counts.filter((c) => c.n > 0).map((c) => c.triviaId));

  let deletedCount = 0;
  let closedCount = 0;
  let deletedResponses = 0;
  const skipped: { id: string; reason: 'has_responses' }[] = [];

  if (mode === 'force') {
    // Drop responses first to satisfy the FK, then drop the trivias themselves.
    const resp = await db
      .delete(triviaResponses)
      .where(inArray(triviaResponses.triviaId, ids))
      .returning({ id: triviaResponses.id });
    deletedResponses = resp.length;
    await db.delete(trivias).where(inArray(trivias.id, ids));
    deletedCount = ids.length;
  } else if (mode === 'delete') {
    const safe = ids.filter((id) => !withResponses.has(id));
    const blocked = ids.filter((id) => withResponses.has(id));
    if (safe.length > 0) {
      await db.delete(trivias).where(inArray(trivias.id, safe));
      deletedCount = safe.length;
    }
    for (const id of blocked) skipped.push({ id, reason: 'has_responses' });
  } else if (mode === 'close') {
    await db
      .update(trivias)
      .set({ closesAt: new Date() })
      .where(and(inArray(trivias.id, ids), sql`${trivias.closesAt} > NOW()`));
    closedCount = ids.length;
  } else {
    // auto: delete those without responses, close those with responses
    const toDelete = ids.filter((id) => !withResponses.has(id));
    const toClose = ids.filter((id) => withResponses.has(id));
    if (toDelete.length > 0) {
      await db.delete(trivias).where(inArray(trivias.id, toDelete));
      deletedCount = toDelete.length;
    }
    if (toClose.length > 0) {
      await db
        .update(trivias)
        .set({ closesAt: new Date() })
        .where(and(inArray(trivias.id, toClose), sql`${trivias.closesAt} > NOW()`));
      closedCount = toClose.length;
    }
  }

  await db.insert(auditLog).values({
    eventType: 'admin_trivias_bulk_action',
    userId: adminId,
    payload: { mode, requested: ids.length, deletedCount, closedCount, deletedResponses, skipped: skipped.length },
  });

  return NextResponse.json({
    requested: ids.length,
    deletedCount,
    closedCount,
    deletedResponses,
    skipped,
  });
}
