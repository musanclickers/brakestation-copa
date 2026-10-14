import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = process.env.MAGIC_LINK_SECRET;
  if (!secret) throw new Error('MAGIC_LINK_SECRET not configured');
  return secret;
}

export function generateMagicToken(userId: string, ticketCode: string): string {
  const ts = Date.now();
  const payload = `${userId}.${ticketCode}.${ts}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyMagicToken(token: string): { userId: string; ticketCode: string } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, ticketCode, tsStr, sig] = parts as [string, string, string, string];
  const payload = `${userId}.${ticketCode}.${tsStr}`;
  const expected = createHmac('sha256', getSecret()).update(payload).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length) return null;
    if (!timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > MAX_AGE * 1000) return null;
  return { userId, ticketCode };
}
