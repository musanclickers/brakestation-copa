import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { auditLog } from '@brakestation/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type PreviewRow = { to_delete: number; affected_tickets: number; inflated_points: number };

async function computePreview() {
  // PARTITION uses a normalized question (lower + collapse whitespace) so that
  // copies of the same prompt with stray spaces or capitalization land in the
  // same bucket — the first dedupe missed those and the score stayed inflated.
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        tr.id AS response_id,
        tr.user_id,
        tr.ticket_code,
        tr.selected_option,
        t.correct_option,
        ROW_NUMBER() OVER (
          PARTITION BY tr.user_id, tr.ticket_code, t.phase_label,
                       REGEXP_REPLACE(TRIM(LOWER(t.question)), '\s+', ' ', 'g')
          ORDER BY tr.submitted_at ASC, tr.id ASC
        ) AS rn
      FROM trivia_responses tr
      JOIN trivias t ON tr.trivia_id = t.id
    )
    SELECT
      COUNT(*) FILTER (WHERE rn > 1)::int AS to_delete,
      COUNT(DISTINCT ticket_code) FILTER (WHERE rn > 1)::int AS affected_tickets,
      COALESCE(SUM(CASE WHEN rn > 1 AND selected_option = correct_option THEN 2 ELSE 0 END), 0)::int AS inflated_points
    FROM ranked;
  `);
  const rows = (result as unknown as { rows: PreviewRow[] }).rows ?? (result as unknown as PreviewRow[]);
  return rows[0] ?? { to_delete: 0, affected_tickets: 0, inflated_points: 0 };
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

  const preview = await computePreview();

  if (!apply) {
    return NextResponse.json({ mode: 'preview', ...preview });
  }

  // Destructive path — single statement, implicit transaction.
  // Same normalization as preview so apply matches what preview reported.
  const deleted = await db.execute(sql`
    WITH ranked AS (
      SELECT
        tr.id AS response_id,
        ROW_NUMBER() OVER (
          PARTITION BY tr.user_id, tr.ticket_code, t.phase_label,
                       REGEXP_REPLACE(TRIM(LOWER(t.question)), '\s+', ' ', 'g')
          ORDER BY tr.submitted_at ASC, tr.id ASC
        ) AS rn
      FROM trivia_responses tr
      JOIN trivias t ON tr.trivia_id = t.id
    )
    DELETE FROM trivia_responses
    WHERE id IN (SELECT response_id FROM ranked WHERE rn > 1)
    RETURNING id;
  `);
  const rows = (deleted as unknown as { rows: { id: string }[] }).rows
    ?? (deleted as unknown as { id: string }[]);
  const deletedCount = Array.isArray(rows) ? rows.length : 0;

  await db.insert(auditLog).values({
    eventType: 'admin_trivia_responses_deduped',
    userId: adminId,
    payload: {
      previewBeforeApply: preview,
      deletedCount,
    },
  });

  return NextResponse.json({
    mode: 'applied',
    deletedCount,
    previewBeforeApply: preview,
  });
}
