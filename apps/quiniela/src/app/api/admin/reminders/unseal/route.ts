import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { ticketRegistrations, users, phaseSubmissions } from '@brakestation/db/schema';
import { getCurrentPhase, PHASE_LABELS } from '@brakestation/db/phases';
import type { Phase } from '@brakestation/db/phases';
import { eq, and, or, isNull } from 'drizzle-orm';
import { ne } from 'drizzle-orm';
import { Resend } from 'resend';
import { generateMagicToken } from '@brakestation/auth';
import { reminderHtml } from '@/lib/email-templates';
import { sendWhatsApp } from '@/lib/whatsapp';
import { waReminderMessage } from '@/lib/whatsapp-messages';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 600;

const WA_BATCH_SIZE = 20;
const WA_DELAY_MS = 10_000;

export async function POST(request: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const channel = searchParams.get('channel') ?? 'email';

  const phase = await getCurrentPhase();
  if (!phase) {
    return Response.json({ error: 'no_open_phase', message: 'No hay una fase abierta en este momento.' }, { status: 400 });
  }

  const phaseLabel = PHASE_LABELS[phase as Phase];
  const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';

  const approved = await db
    .select({
      regId: ticketRegistrations.id,
      userId: ticketRegistrations.userId,
      ticketCode: ticketRegistrations.ticketCode,
      participantPhone: ticketRegistrations.participantPhone,
      email: users.email,
      waReminderPhase: ticketRegistrations.waReminderPhase,
    })
    .from(ticketRegistrations)
    .innerJoin(users, eq(users.id, ticketRegistrations.userId))
    .where(eq(ticketRegistrations.reviewStatus, 'approved'));

  const sealed = await db
    .select({
      userId: phaseSubmissions.userId,
      ticketCode: phaseSubmissions.ticketCode,
    })
    .from(phaseSubmissions)
    .where(eq(phaseSubmissions.phase, phase));

  const sealedSet = new Set(sealed.map((s) => `${s.userId}:${s.ticketCode}`));
  const unsealed = approved.filter((r) => !sealedSet.has(`${r.userId}:${r.ticketCode}`));

  if (unsealed.length === 0) {
    return Response.json({ ok: true, sent: 0, total: 0, remaining: 0, message: 'Todos los participantes ya sellaron.' });
  }

  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const resend = channel === 'email' ? new Resend(process.env.RESEND_API_KEY) : null;
  let emailsSent = 0;
  let whatsappSent = 0;

  if (channel === 'email') {
    for (const u of unsealed) {
      if (!u.email || !resend) continue;
      try {
        const magicToken = generateMagicToken(u.userId, u.ticketCode);
        const magicUrl = `${baseUrl}/auth/magic?token=${magicToken}`;
        await resend.emails.send({
          from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
          to: u.email,
          subject: `⏰ Sella tus pronósticos — ${phaseLabel}`,
          html: reminderHtml(u.ticketCode, phaseLabel, magicUrl),
        });
        emailsSent++;
      } catch (err) {
        console.error(`[reminder] email failed for ${u.email}:`, err);
      }
    }
  }

  if (channel === 'whatsapp') {
    const pending = unsealed.filter((r) => r.waReminderPhase !== phase && r.participantPhone);
    const batch = pending.slice(0, WA_BATCH_SIZE);

    for (let i = 0; i < batch.length; i++) {
      const u = batch[i]!;
      if (i > 0) await delay(WA_DELAY_MS);
      try {
        const magicToken = generateMagicToken(u.userId, u.ticketCode);
        const magicUrl = `${baseUrl}/auth/magic?token=${magicToken}`;
        const waOk = await sendWhatsApp(u.participantPhone, waReminderMessage(u.ticketCode, phaseLabel, magicUrl));
        if (waOk) {
          whatsappSent++;
          await db
            .update(ticketRegistrations)
            .set({ waReminderPhase: phase, waReminderSentAt: new Date() })
            .where(eq(ticketRegistrations.id, u.regId));
        } else {
          console.warn(`[reminder] WA send returned false for ${u.ticketCode} phone=${u.participantPhone}`);
        }
      } catch (err) {
        console.error(`[reminder] WA send threw for ${u.ticketCode}:`, err);
      }
    }

    const remaining = pending.length - batch.length;
    return Response.json({
      ok: true,
      channel,
      phase,
      phaseLabel,
      total: unsealed.length,
      alreadySent: unsealed.length - pending.length,
      whatsappSent,
      batchSize: batch.length,
      remaining,
    });
  }

  return Response.json({
    ok: true,
    channel,
    phase,
    phaseLabel,
    total: unsealed.length,
    emailsSent,
    whatsappSent,
  });
}
