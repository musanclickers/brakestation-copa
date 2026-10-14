import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  currentPassword: z.string().optional(),
  newPassword: z.string().min(12).max(200),
});

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const userId = await getAdminUserId();
  if (!userId) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', message: 'La nueva contraseña debe tener al menos 12 caracteres.' }, { status: 400 });
  }
  const { currentPassword, newPassword } = parsed.data;

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true, adminPasswordHash: true },
  });
  if (!user) return Response.json({ error: 'unauthenticated' }, { status: 401 });

  // Sin hash = admin recién dado de alta con el link de ADMIN_EMAILS: no hay
  // contraseña actual que pedir. Con hash, la actual es obligatoria.
  if (user.adminPasswordHash) {
    if (!currentPassword || !(await bcrypt.compare(currentPassword, user.adminPasswordHash))) {
      return Response.json({ error: 'invalid_current_password', message: 'La contraseña actual no es correcta.' }, { status: 401 });
    }
    if (currentPassword === newPassword) {
      return Response.json({ error: 'same_password', message: 'La nueva contraseña debe ser distinta de la actual.' }, { status: 400 });
    }
  }

  await db
    .update(users)
    .set({ adminPasswordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false })
    .where(eq(users.id, userId));

  return Response.json({ ok: true });
}
