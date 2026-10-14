import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { generateMagicToken, SITE_URL } from '@brakestation/auth';
import { db } from '@brakestation/db';
import { users, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const schema = z.object({ email: z.string().trim().toLowerCase().email() });

// Solo para participantes ya registrados (nombre + términos aceptados): el
// admin no puede registrar a alguien a su nombre.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', message: 'Correo inválido' }, { status: 400 });

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { id: true, name: true, termsAcceptedAt: true },
  });
  if (!user?.termsAcceptedAt) {
    return NextResponse.json({ error: 'not_registered', message: 'Ese correo no se ha registrado. Pídele que se registre en la página de inicio.' }, { status: 404 });
  }

  await db.insert(adminActions).values({ adminId, action: 'generate_login_link', targetTable: 'users', targetId: user.id });

  const token = generateMagicToken(user.id, 'login');
  return NextResponse.json({
    link: `${SITE_URL}/auth/magic?${new URLSearchParams({ token, next: '/quiniela' })}`,
    name: user.name,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });
}
