import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { setAdminCookie } from '@/lib/admin-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(8),
});

const attempts = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function checkRateLimit(key: string): boolean {
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || now > rec.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (rec.count >= MAX_ATTEMPTS) return false;
  rec.count++;
  return true;
}

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: 'too_many_attempts', message: 'Demasiados intentos. Espera 15 minutos.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input' }, { status: 400 });
  }

  const user = await db.query.users.findFirst({
    where: eq(users.email, parsed.data.email),
    columns: { id: true, isAdmin: true, adminPasswordHash: true, mustChangePassword: true },
  });

  const invalid = () =>
    Response.json({ error: 'invalid_credentials', message: 'Email o contraseña incorrectos.' }, { status: 401 });

  if (!user || !user.isAdmin || !user.adminPasswordHash) return invalid();

  const ok = await bcrypt.compare(parsed.data.password, user.adminPasswordHash);
  if (!ok) return invalid();

  await setAdminCookie(user.id);
  attempts.delete(ip);

  if (user.mustChangePassword) {
    return Response.json({ ok: true, redirect: '/admin/change-password' });
  }

  return Response.json({ ok: true, redirect: '/admin/registrations' });
}
