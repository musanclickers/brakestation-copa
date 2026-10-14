import { getAdminUserId } from '@/lib/admin-auth';
import { getWhatsAppStatus } from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const status = await getWhatsAppStatus();
  return Response.json(status);
}
