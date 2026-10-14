import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getAdminUserId } from '@/lib/admin-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(12),
});

export async function POST(req: Request) {
  const userId = await getAdminUserId();
  if (!userId) {
    return Response.json({ error: 'unauthenticated' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', message: 'La nueva contraseña debe tener al menos 12 caracteres.' }, { status: 400 });
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return Response.json({ error: 'same_password', message: 'La nueva contraseña debe ser distinta de la actual.' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, adminPasswordHash: true },
  });

  if (!user?.adminPasswordHash) {
    return Response.json({ error: 'no_password_set' }, { status: 400 });
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.adminPasswordHash);
  if (!ok) {
    return Response.json({ error: 'invalid_current_password', message: 'La contraseña actual no es correcta.' }, { status: 401 });
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await db
    .update(users)
    .set({
      adminPasswordHash: newHash,
      mustChangePassword: false,
    })
    .where(eq(users.id, userId));

  return Response.json({ ok: true });
}
