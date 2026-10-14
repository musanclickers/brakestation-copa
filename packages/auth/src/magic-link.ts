import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE = 60 * 60 * 24; // 24 hours

function getSecret(): string {
  const secret = process.env.MAGIC_LINK_SECRET;
  if (!secret) throw new Error('MAGIC_LINK_SECRET not configured');
  return secret;
}

// purpose separa links de participante ('login') de los de alta de admin
// ('admin_setup'), para que uno no sirva como el otro.
export type MagicPurpose = 'login' | 'admin_setup';

export function generateMagicToken(userId: string, purpose: MagicPurpose = 'login'): string {
  const payload = `${userId}.${purpose}.${Date.now()}`;
  const sig = createHmac('sha256', getSecret()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyMagicToken(token: string, purpose: MagicPurpose = 'login'): { userId: string } | null {
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [userId, tokenPurpose, tsStr, sig] = parts as [string, string, string, string];
  if (tokenPurpose !== purpose) return null;
  const expected = createHmac('sha256', getSecret()).update(`${userId}.${tokenPurpose}.${tsStr}`).digest('hex');
  try {
    const a = Buffer.from(sig, 'hex');
    const b = Buffer.from(expected, 'hex');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts) || Date.now() - ts > MAX_AGE * 1000) return null;
  return { userId };
}
