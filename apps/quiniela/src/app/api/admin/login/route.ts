import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { setAdminCookie } from '@/lib/admin-auth';
import { rateLimit, resetRateLimit, clientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(200),
  turnstileToken: z.string().max(4096).optional(),
});

const WINDOW_MS = 15 * 60 * 1000;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const ip = clientIp(req);
  if (!rateLimit(`admin-login:${ip}`, 5, WINDOW_MS)) {
    return Response.json({ error: 'too_many_attempts', message: 'Demasiados intentos. Espera 15 minutos.' }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_input', message: 'Escribe tu email y contraseña.' }, { status: 400 });

  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return Response.json({ error: 'captcha_failed', message: 'No pudimos confirmar que eres humano. Recarga e intenta de nuevo.' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { id: true, isAdmin: true, adminPasswordHash: true, mustChangePassword: true },
  });

  const invalid = () => Response.json({ error: 'invalid_credentials', message: 'Email o contraseña incorrectos.' }, { status: 401 });
  if (!user || !user.isAdmin || !user.adminPasswordHash) return invalid();
  if (!(await bcrypt.compare(parsed.data.password, user.adminPasswordHash))) return invalid();

  await setAdminCookie(user.id);
  resetRateLimit(`admin-login:${ip}`);

  return Response.json({ ok: true, redirect: user.mustChangePassword ? '/admin/change-password' : '/admin/matches' });
}
