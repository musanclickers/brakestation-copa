import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, adminActions } from '@brakestation/db/schema';
import { eq, ne, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const target = await db.query.ticketRegistrations.findFirst({
    where: eq(ticketRegistrations.id, id),
  });
  if (!target) return Response.json({ error: 'not_found' }, { status: 404 });
  if (target.reviewStatus !== 'rejected') {
    return Response.json(
      { error: 'invalid_status', message: 'Solo registros rechazados pueden revertirse.' },
      { status: 400 },
    );
  }

  // The partial unique index (ticket_code WHERE review_status != 'rejected')
  // prevents two non-rejected registrations for the same ticket.
  const conflict = await db.query.ticketRegistrations.findFirst({
    where: and(
      eq(ticketRegistrations.ticketCode, target.ticketCode),
      ne(ticketRegistrations.reviewStatus, 'rejected'),
      ne(ticketRegistrations.id, target.id),
    ),
  });
  if (conflict) {
    return Response.json(
      {
        error: 'conflict',
        message: `Hay otro registro activo para el boleto ${target.ticketCode}. Decide cuál mantener antes de revertir.`,
      },
      { status: 409 },
    );
  }

  const beforeState = {
    review_status: target.reviewStatus,
    reviewed_by: target.reviewedBy,
    reviewed_at: target.reviewedAt,
    review_notes: target.reviewNotes,
  };

  await db
    .update(ticketRegistrations)
    .set({
      reviewStatus: 'pending',
      reviewedBy: null,
      reviewedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(ticketRegistrations.id, id));

  await db.insert(adminActions).values({
    adminId,
    action: 'revert_rejection',
    targetTable: 'ticket_registrations',
    targetId: id,
    beforeState,
    afterState: {
      review_status: 'pending',
      previous_notes: target.reviewNotes,
    },
  });

  return Response.json({ ok: true });
}
