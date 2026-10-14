import { getAdminUserId } from '@/lib/admin-auth';
import { logoutWhatsApp } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function POST() {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const ok = await logoutWhatsApp();
  return Response.json({ ok });
}
