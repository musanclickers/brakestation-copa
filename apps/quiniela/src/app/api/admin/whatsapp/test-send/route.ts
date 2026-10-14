import { getAdminUserId } from '@/lib/admin-auth';
import { sendWhatsApp } from '@/lib/whatsapp';
import {
  waApprovedMessage,
  waRejectedMessage,
  waNewPhotoMessage,
  waReminderMessage,
  waSealedMessage,
} from '@/lib/whatsapp-messages';

export const dynamic = 'force-dynamic';

const DEMO_TICKET = 'TEST-001';
const DEMO_LINK = 'https://goleadora.brakestation.com.mx/demo';

const templates: Record<string, () => string> = {
  approved: () => waApprovedMessage(DEMO_TICKET, DEMO_LINK),
  rejected: () => waRejectedMessage(DEMO_TICKET, 'La foto está borrosa y no se distingue el código del boleto.'),
  new_photo: () => waNewPhotoMessage(DEMO_TICKET, 'La imagen está cortada, necesitamos ver el boleto completo.'),
  reminder: () => waReminderMessage(DEMO_TICKET, 'Fase de Grupos', DEMO_LINK),
  sealed: () => waSealedMessage(DEMO_TICKET, 'Fase de Grupos', 'A1B2C3'),
};

export async function POST(request: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await request.json();
  const { phone, template } = body as { phone?: string; template?: string };

  if (!phone || !template) {
    return Response.json({ error: 'missing phone or template' }, { status: 400 });
  }

  const buildMessage = templates[template];
  if (!buildMessage) {
    return Response.json({ error: `unknown template: ${template}` }, { status: 400 });
  }

  const message = buildMessage();
  const ok = await sendWhatsApp(phone, message);

  return Response.json({ ok, template, phone });
}
