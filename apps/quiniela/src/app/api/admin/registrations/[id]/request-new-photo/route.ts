import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, users, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { Resend } from 'resend';
import { sendWhatsApp } from '@/lib/whatsapp';
import { waNewPhotoMessage } from '@/lib/whatsapp-messages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({ reason: z.string().min(10).max(500) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'invalid_input', message: 'El motivo debe tener al menos 10 caracteres.' }, { status: 400 });

  const registration = await db.query.ticketRegistrations.findFirst({
    where: eq(ticketRegistrations.id, id),
  });
  if (!registration) return Response.json({ error: 'not_found' }, { status: 404 });
  if (registration.reviewStatus !== 'pending') {
    return Response.json({ error: 'invalid_status', message: 'Solo registros pendientes pueden solicitar nueva foto.' }, { status: 400 });
  }

  await db.update(ticketRegistrations).set({
    reviewStatus: 'awaiting_new_photo',
    reviewNotes: parsed.data.reason,
    reviewedBy: adminId,
    reviewedAt: new Date(),
    updatedAt: new Date(),
  }).where(eq(ticketRegistrations.id, id));

  await db.insert(adminActions).values({
    adminId,
    action: 'request_new_photo',
    targetTable: 'ticket_registrations',
    targetId: id,
    afterState: { reason: parsed.data.reason },
  });

  const regUser = await db.query.users.findFirst({ where: eq(users.id, registration.userId) });
  if (regUser?.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
        to: regUser.email,
        subject: 'Necesitamos una nueva foto de tu boleto',
        html: buildNewPhotoEmail(registration.ticketCode, parsed.data.reason),
      });
    } catch (e) {
      console.error('[request-new-photo] email failed', e);
    }
  }

  if (registration.participantPhone) {
    sendWhatsApp(registration.participantPhone, waNewPhotoMessage(registration.ticketCode, parsed.data.reason));
  }

  return Response.json({ ok: true });
}

function buildNewPhotoEmail(ticketCode: string, reason: string): string {
  return [
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>',
    '<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,sans-serif;">',
    '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F4F4;padding:32px 16px;"><tr><td align="center">',
    '<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;">',
    '<tr><td style="background:linear-gradient(135deg,#0a1e3d 0%,#3A63A8 100%);padding:24px 32px;text-align:center;">',
    '<img src="https://assets.brakestation.com.mx/images/logo_gbs.png" alt="Brake Station" width="140" style="display:inline-block;" />',
    '<span style="display:inline-block;color:#FFFFFF;font-size:22px;font-weight:300;margin:0 14px;vertical-align:middle;">×</span>',
    '<img src="https://assets.brakestation.com.mx/images/logo_cana.png" alt="CanaBRAKE" width="70" style="display:inline-block;" />',
    '<p style="color:rgba(255,255,255,0.85);font-size:11px;letter-spacing:2px;text-transform:uppercase;margin:14px 0 0 0;">Dinámica Goleadora · Mundial 2026</p>',
    '</td></tr>',
    '<tr><td style="padding:40px 32px;">',
    '<h1 style="margin:0 0 16px 0;color:#232124;font-size:24px;">📸 Necesitamos una nueva foto</h1>',
    `<p style="color:#4a4a4a;font-size:15px;line-height:1.6;">Tu registro del boleto <strong>${ticketCode}</strong> necesita una foto actualizada.</p>`,
    `<div style="background:#FFF8E1;border-left:4px solid #F59E0B;padding:16px;border-radius:4px;margin:24px 0;"><p style="margin:0;color:#92400E;font-size:14px;"><strong>Motivo:</strong> ${reason}</p></div>`,
    '<p style="color:#4a4a4a;font-size:15px;line-height:1.6;">Tus datos personales quedan intactos. Solo necesitas subir la foto nueva.</p>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px auto;"><tr><td align="center" bgcolor="#E32125" style="border-radius:8px;background-color:#E32125;">',
    '<a href="https://goleadora.brakestation.com.mx/activar" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;">Subir nueva foto →</a>',
    '</td></tr></table>',
    '<p style="color:#888;font-size:13px;border-top:1px solid #E5E5E5;padding-top:24px;">Si tienes dudas, contacta a tu asesor comercial de Brake Station.</p>',
    '</td></tr>',
    '<tr><td style="background:#232124;padding:24px 32px;text-align:center;"><p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">Brake Station · Centro de Distribución oficial CanaBRAKE</p></td></tr>',
    '</table></td></tr></table></body></html>',
  ].join('');
}
