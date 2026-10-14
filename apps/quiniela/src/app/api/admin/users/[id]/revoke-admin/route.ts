import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { db } from '@brakestation/db';
import { users, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  if (adminId === id) {
    return Response.json({ error: 'cannot_revoke_self', message: 'No puedes revocarte a ti mismo.' }, { status: 400 });
  }

  const target = await db.query.users.findFirst({
    where: eq(users.id, id),
    columns: { id: true, email: true, isAdmin: true },
  });

  if (!target) return Response.json({ error: 'not_found' }, { status: 404 });
  if (!target.isAdmin) return Response.json({ error: 'already_revoked' }, { status: 400 });

  await db.update(users).set({
    isAdmin: false,
    adminPasswordHash: null,
    mustChangePassword: false,
  }).where(eq(users.id, id));

  await db.insert(adminActions).values({
    adminId,
    action: 'revoke_admin',
    targetTable: 'users',
    targetId: id,
    afterState: { targetEmail: target.email },
  });

  return Response.json({ ok: true });
}
