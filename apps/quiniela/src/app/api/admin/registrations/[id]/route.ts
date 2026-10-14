import { db } from '@brakestation/db';
import { users, ticketRegistrations, adminActions } from '@brakestation/db/schema';
import { getAdminUserId } from '@/lib/admin-auth';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { approvedHtml, rejectedHtml } from '@/lib/email-templates';
import { generateMagicToken } from '@brakestation/auth';
import { sendWhatsApp } from '@/lib/whatsapp';
import { waApprovedMessage, waRejectedMessage } from '@/lib/whatsapp-messages';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  review_status: z.enum(['approved', 'rejected']),
  review_notes: z.string().max(500).optional(),
  client_id: z.string().uuid().nullable().optional(),
});

const resend = new Resend(process.env.RESEND_API_KEY);

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth + admin check
  const adminId = await getAdminUserId();
  if (!adminId) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation', details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Find registration
  const registration = await db.query.ticketRegistrations.findFirst({
    where: eq(ticketRegistrations.id, id),
  });
  if (!registration) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const beforeState = {
    review_status: registration.reviewStatus,
    reviewed_by: registration.reviewedBy,
    reviewed_at: registration.reviewedAt,
    review_notes: registration.reviewNotes,
    client_id: registration.clientId,
  };

  // Update registration
  const now = new Date();
  const updateFields: Record<string, unknown> = {
    reviewStatus: parsed.data.review_status,
    reviewedBy: adminId,
    reviewedAt: now,
    reviewNotes: parsed.data.review_notes ?? null,
    updatedAt: now,
  };
  if (parsed.data.client_id !== undefined) {
    updateFields.clientId = parsed.data.client_id;
  }
  await db
    .update(ticketRegistrations)
    .set(updateFields)
    .where(eq(ticketRegistrations.id, id));

  // Audit trail
  await db.insert(adminActions).values({
    adminId: adminId,
    action: `registration_${parsed.data.review_status}`,
    targetTable: 'ticket_registrations',
    targetId: id,
    beforeState,
    afterState: parsed.data,
  });

  // Send email to user
  const regUser = await db.query.users.findFirst({
    where: eq(users.id, registration.userId),
  });
  if (regUser?.email) {
    try {
      if (parsed.data.review_status === 'approved') {
        const magicToken = generateMagicToken(registration.userId, registration.ticketCode);
        const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';
        const magicUrl = `${baseUrl}/auth/magic?token=${magicToken}`;

        await resend.emails.send({
          from:
            process.env.EMAIL_FROM ||
            'Brake Station <no-reply@brakestation.com.mx>',
          to: regUser.email,
          subject: 'Tu boleto fue aprobado — Dinámica Goleadora',
          html: approvedHtml(registration.ticketCode, magicUrl),
        });
        if (registration.participantPhone) {
          sendWhatsApp(registration.participantPhone, waApprovedMessage(registration.ticketCode, magicUrl));
        }
      } else {
        await resend.emails.send({
          from:
            process.env.EMAIL_FROM ||
            'Brake Station <no-reply@brakestation.com.mx>',
          to: regUser.email,
          subject: 'Registro rechazado — Dinámica Goleadora',
          html: rejectedHtml(registration.ticketCode, parsed.data.review_notes),
        });
        if (registration.participantPhone) {
          sendWhatsApp(registration.participantPhone, waRejectedMessage(registration.ticketCode, parsed.data.review_notes ?? ''));
        }
      }
    } catch (err) {
      console.error('[email] resend send failed:', err);
    }
  }

  return NextResponse.json({ ok: true });
}

