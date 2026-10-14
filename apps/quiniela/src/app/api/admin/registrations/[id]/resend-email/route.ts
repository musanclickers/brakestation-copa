import { getAdminUserId } from '@/lib/admin-auth';
import { generateMagicToken } from '@brakestation/auth';
import { approvedHtml } from '@/lib/email-templates';
import { sendWhatsApp } from '@/lib/whatsapp';
import { waApprovedMessage } from '@/lib/whatsapp-messages';
import { db } from '@brakestation/db';
import { ticketRegistrations, users } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const reg = await db.query.ticketRegistrations.findFirst({
    where: eq(ticketRegistrations.id, id),
  });
  if (!reg) return Response.json({ error: 'not_found' }, { status: 404 });
  if (reg.reviewStatus !== 'approved') {
    return Response.json(
      { error: 'not_approved', message: 'Solo se puede reenviar a registros aprobados.' },
      { status: 400 },
    );
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, reg.userId),
    columns: { id: true, email: true },
  });
  if (!user?.email) {
    return Response.json({ error: 'no_email', message: 'El usuario no tiene email.' }, { status: 400 });
  }

  const magicToken = generateMagicToken(reg.userId, reg.ticketCode);
  const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';
  const magicUrl = `${baseUrl}/auth/magic?token=${magicToken}`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
    to: user.email,
    subject: 'Tu boleto fue aprobado — Dinámica Goleadora',
    html: approvedHtml(reg.ticketCode, magicUrl),
  });

  if (reg.participantPhone) {
    sendWhatsApp(reg.participantPhone, waApprovedMessage(reg.ticketCode, magicUrl));
  }

  return Response.json({ ok: true });
}
