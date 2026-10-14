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
  if (!token) redirect('/activar');

  const result = verifyMagicToken(token);
  if (!result) redirect('/activar?error=link_expired');

  const user = await db.query.users.findFirst({
    where: eq(users.id, result.userId),
    columns: { id: true },
  });
  if (!user) redirect('/activar');

  const sessionToken = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({
    sessionToken,
    userId: user.id,
    expires,
  });

  const isSecure = url.protocol === 'https:';
  const cookieName = isSecure ? '__Secure-authjs.session-token' : 'authjs.session-token';

  (await cookies()).set(cookieName, sessionToken, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    expires,
    path: '/',
  });

  if (next) redirect(next);
  if (result.ticketCode) redirect(`/quiniela?ticket=${result.ticketCode}`);
  redirect('/activar');
}
