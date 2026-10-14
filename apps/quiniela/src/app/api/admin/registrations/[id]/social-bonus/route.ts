import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ granted: z.boolean() });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'invalid_input' }, { status: 400 });

  const before = await db.query.ticketRegistrations.findFirst({
    where: eq(ticketRegistrations.id, id),
    columns: { id: true, socialBonusGranted: true, reviewStatus: true },
  });
  if (!before) return Response.json({ error: 'not_found' }, { status: 404 });

  if (parsed.data.granted && before.reviewStatus !== 'approved') {
    return Response.json({ error: 'not_approved', message: 'El registro debe estar aprobado antes de otorgar el bonus social.' }, { status: 400 });
  }

  await db.update(ticketRegistrations)
    .set({
      socialBonusGranted: parsed.data.granted,
      socialBonusGrantedAt: parsed.data.granted ? new Date() : null,
      socialBonusGrantedBy: parsed.data.granted ? adminId : null,
    })
    .where(eq(ticketRegistrations.id, id));

  await db.insert(adminActions).values({
    adminId,
    action: parsed.data.granted ? 'grant_social_bonus' : 'revoke_social_bonus',
    targetTable: 'ticket_registrations',
    targetId: id,
    beforeState: { socialBonusGranted: before.socialBonusGranted },
    afterState: { socialBonusGranted: parsed.data.granted },
  });

  return Response.json({ ok: true });
}
