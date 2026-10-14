import { getAdminUserId } from '@/lib/admin-auth';

export const dynamic = 'force-dynamic';

const WA_URL = process.env.WA_SERVICE_URL || 'http://whatsapp:3001';
const WA_TOKEN = process.env.WA_INTERNAL_TOKEN || '';

export async function GET(request: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  try {
    const headers: Record<string, string> = {};
    if (WA_TOKEN) headers['Authorization'] = `Bearer ${WA_TOKEN}`;

    const url = new URL(request.url);
    const endpoint = url.searchParams.get('net') === '1' ? '/test-net' : '/debug';
    const res = await fetch(`${WA_URL}${endpoint}`, {
      headers,
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return Response.json({ error: 'wa service error', status: res.status });
    const data = await res.json();
    return Response.json(data);
  } catch (err: any) {
    return Response.json({ error: 'cannot reach wa service', message: err?.message });
  }
}
