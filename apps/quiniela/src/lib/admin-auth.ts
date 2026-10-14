import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from '@brakestation/db';
import { users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';

const COOKIE_NAME = 'admin_session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function sign(userId: string): string {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) throw new Error('ADMIN_COOKIE_SECRET not configured');
  const ts = Date.now();
  const payload = `${userId}.${ts}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function verify(token: string): { userId: string; ts: number } | null {
  const secret = process.env.ADMIN_COOKIE_SECRET;
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const userId = parts[0]!;
  const tsStr = parts[1]!;
  const sig = parts[2]!;
  const payload = `${userId}.${tsStr}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return null;
  if (Date.now() - ts > COOKIE_MAX_AGE * 1000) return null;
  return { userId, ts };
}

export async function setAdminCookie(userId: string) {
  const token = sign(userId);
  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
}

export async function clearAdminCookie() {
  (await cookies()).delete(COOKIE_NAME);
}

export async function getAdminUserId(): Promise<string | null> {
  const cookie = (await cookies()).get(COOKIE_NAME);
  if (!cookie?.value) return null;
  const verified = verify(cookie.value);
  if (!verified) return null;
  const user = await db.query.users.findFirst({
    where: eq(users.id, verified.userId),
    columns: { id: true, isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return user.id;
}

export async function requireAdminCookie(): Promise<string> {
  const userId = await getAdminUserId();
  if (!userId) redirect('/admin/login');
  return userId;
}
