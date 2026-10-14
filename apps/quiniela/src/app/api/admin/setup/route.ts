import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { sendAdminSetupLink, verifyMagicToken } from '@brakestation/auth';
import { eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { setAdminCookie } from '@/lib/admin-auth';
import { isAdminEmail } from '@/lib/admin-emails';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Alta del primer acceso admin. Solo sirve para correos en ADMIN_EMAILS que
// todavía no tienen contraseña. La respuesta es siempre la misma para no revelar
// qué correos son admin.
const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  turnstileToken: z.string().max(4096).optional(),
});

const GENERIC = { ok: true, message: 'Si tu correo está autorizado como admin, te llegará un link para crear tu contraseña.' };

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const ip = clientIp(req);
  if (!rateLimit(`admin-setup:${ip}`, 5, 60 * 60 * 1000)) {
    return Response.json({ error: 'too_many_requests', message: 'Demasiadas solicitudes. Espera una hora.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_input', message: 'Escribe un correo válido.' }, { status: 400 });
  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return Response.json({ error: 'captcha_failed', message: 'No pudimos confirmar que eres humano. Recarga e intenta de nuevo.' }, { status: 400 });
  }

  const { email } = parsed.data;
  if (!isAdminEmail(email) || !rateLimit(`admin-setup:${email}`, 3, 60 * 60 * 1000)) return Response.json(GENERIC);

  const existing = await db.query.users.findFirst({ where: eq(users.email, email), columns: { id: true, adminPasswordHash: true } });
  if (existing?.adminPasswordHash) return Response.json(GENERIC); // ya tiene contraseña; si la olvidó, otro admin lo re-invita desde /admin/users

  let userId = existing?.id;
  if (userId) {
    await db.update(users).set({ isAdmin: true, mustChangePassword: true }).where(eq(users.id, userId));
  } else {
    const inserted = await db
      .insert(users)
      .values({ email, isAdmin: true, mustChangePassword: true })
      .returning({ id: users.id });
    userId = inserted[0]!.id;
  }

  try {
    await sendAdminSetupLink(userId, email);
  } catch (err) {
    console.error('[admin-setup] envío falló', err);
  }
  return Response.json(GENERIC);
}

// El link del correo cae aquí: valida el token, abre sesión admin y manda a
// crear contraseña. Deja de servir en cuanto la contraseña existe.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token');
  const result = token ? verifyMagicToken(token, 'admin_setup') : null;
  if (!result) redirect('/admin/login?error=link_expired');

  const user = await db.query.users.findFirst({
    where: eq(users.id, result.userId),
    columns: { id: true, email: true, isAdmin: true, adminPasswordHash: true },
  });
  if (!user?.isAdmin || user.adminPasswordHash || !isAdminEmail(user.email)) redirect('/admin/login?error=link_used');

  await setAdminCookie(user.id);
  redirect('/admin/change-password');
}
