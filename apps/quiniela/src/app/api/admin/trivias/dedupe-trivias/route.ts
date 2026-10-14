import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { auditLog, trivias, triviaResponses } from '@brakestation/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// For each (phase_label, normalized_question), the canonical trivia is the
// oldest one (smallest opens_at). Every other trivia in the cluster is a
// duplicate produced by re-running the seed on every deploy. Question text is
// normalized (lower + collapse whitespace) so copies with invisible whitespace
// differences land in the same bucket.
async function findDuplicates() {
  const rows = await db.execute(sql`
    WITH ranked AS (
      SELECT
        id,
        phase_label,
        question,
        opens_at,
        ROW_NUMBER() OVER (
          PARTITION BY phase_label, REGEXP_REPLACE(TRIM(LOWER(question)), '\s+', ' ', 'g')
          ORDER BY opens_at ASC, id ASC
        ) AS rn
      FROM trivias
    ),
    duplicates AS (
      SELECT id FROM ranked WHERE rn > 1
    )
    SELECT
      d.id,
      (SELECT COUNT(*)::int FROM trivia_responses tr WHERE tr.trivia_id = d.id) AS response_count
    FROM duplicates d;
  `);
  const list = (rows as unknown as { rows: { id: string; response_count: number }[] }).rows
    ?? (rows as unknown as { id: string; response_count: number }[]);
  return Array.isArray(list) ? list : [];
}

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: { apply?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    // empty body = preview
  }
  const apply = body.apply === true;

  const duplicates = await findDuplicates();
  const toDelete = duplicates.filter((d) => d.response_count === 0);
  const toClose = duplicates.filter((d) => d.response_count > 0);

  const preview = {
    total_duplicates: duplicates.length,
    will_delete: toDelete.length,
    will_close: toClose.length,
    responses_preserved: toClose.reduce((s, d) => s + d.response_count, 0),
  };

  if (!apply) {
    return NextResponse.json({ mode: 'preview', ...preview });
  }

  let deletedCount = 0;
  let closedCount = 0;

  if (toDelete.length > 0) {
    const ids = toDelete.map((d) => d.id);
    await db.delete(trivias).where(inArray(trivias.id, ids));
    deletedCount = ids.length;
  }

  if (toClose.length > 0) {
    const ids = toClose.map((d) => d.id);
    await db
      .update(trivias)
      .set({ closesAt: new Date() })
      .where(and(inArray(trivias.id, ids), sql`${trivias.closesAt} > NOW()`));
    closedCount = ids.length;
  }

  await db.insert(auditLog).values({
    eventType: 'admin_trivias_deduped',
    userId: adminId,
    payload: { previewBeforeApply: preview, deletedCount, closedCount },
  });

  return NextResponse.json({
    mode: 'applied',
    deletedCount,
    closedCount,
    previewBeforeApply: preview,
  });
}
