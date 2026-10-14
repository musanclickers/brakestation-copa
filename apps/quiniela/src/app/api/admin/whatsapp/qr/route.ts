import { getAdminUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const WA_URL = process.env.WA_SERVICE_URL || 'http://whatsapp:3001';
const WA_TOKEN = process.env.WA_INTERNAL_TOKEN || '';

export async function GET() {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  try {
    const headers: Record<string, string> = {};
    if (WA_TOKEN) headers['Authorization'] = `Bearer ${WA_TOKEN}`;

    const res = await fetch(`${WA_URL}/qr-data`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ type: 'waiting' });
    const data = await res.json();
    return Response.json(data);
  } catch {
    return Response.json({ type: 'waiting' });
  }
}
