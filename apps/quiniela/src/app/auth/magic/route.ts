import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { randomBytes } from 'node:crypto';
import { db } from '@brakestation/db';
import { sessions, users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { verifyMagicToken } from '@brakestation/auth';

export const dynamic = 'force-dynamic';

function safeNext(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//')) return null;
  return raw;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');
  const next = safeNext(url.searchParams.get('next'));
  if (!token) redirect('/entrar');

  const result = verifyMagicToken(token);
  if (!result) redirect('/entrar?error=link_expired');

  const user = await db.query.users.findFirst({
    where: eq(users.id, result.userId),
    columns: { id: true, emailVerified: true },
  });
  if (!user) redirect('/entrar');
  if (!user.emailVerified) {
    await db.update(users).set({ emailVerified: new Date() }).where(eq(users.id, user.id));
  }

  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  // Detrás de Cloudflare/Traefik req.url puede llegar como http; AUTH_URL manda.
  const isSecure = (process.env.AUTH_URL ?? url.href).startsWith('https:');
  const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';

  (await cookies()).set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires,
    path: '/',
  });

  redirect(next ?? '/dashboard');
}
