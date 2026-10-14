import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { notificationLogs, auditLog } from '@brakestation/db/schema';
import { resolveAudience } from '@/lib/notification-audiences';
import { getTemplate } from '@/lib/notification-templates';
import { generateMagicToken } from '@brakestation/auth';
import { Resend } from 'resend';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const resend = new Resend(process.env.RESEND_API_KEY);

const AudienceSchema = z.union([
  z.object({ kind: z.literal('all_activated'), cohort: z.enum(['BS', 'CD', 'INT']).optional() }),
  z.object({ kind: z.literal('not_answered_trivia'), triviaId: z.string().uuid() }),
  z.object({ kind: z.literal('not_predicted_open_matches') }),
  z.object({ kind: z.literal('not_sealed_j3') }),
  z.object({ kind: z.literal('sealed_phase'), phase: z.string() }),
  z.object({ kind: z.literal('explicit_emails'), emails: z.array(z.string().email()).min(1) }),
  z.object({ kind: z.literal('test'), email: z.string().email() }),
]);

const SendSchema = z.object({
  templateKey: z.string(),
  audience: AudienceSchema,
  force: z.boolean().optional(),
});

const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = SendSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'validation', details: parsed.error.issues }, { status: 400 });
  }
  const { templateKey, audience, force } = parsed.data;

  const tpl = getTemplate(templateKey);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 404 });

  const isTest = audience.kind === 'test';

  if (!isTest && !force) {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recent = await db
      .select({ startedAt: notificationLogs.startedAt, completedAt: notificationLogs.completedAt })
      .from(notificationLogs)
      .where(
        and(
          eq(notificationLogs.templateKey, templateKey),
          eq(notificationLogs.isTest, false),
          isNotNull(notificationLogs.completedAt),
          gt(notificationLogs.completedAt, sixHoursAgo),
        ),
      )
      .limit(1);
    if (recent.length > 0) {
      return NextResponse.json(
        {
          error: 'recent_send_exists',
          requireForce: true,
          lastSentAt: recent[0]!.completedAt?.toISOString() ?? null,
        },
        { status: 409 },
      );
    }
  }

  const recipients = await resolveAudience(audience);
  if (recipients.length === 0) {
    return NextResponse.json({ error: 'empty_audience' }, { status: 400 });
  }

  const inserted = await db
    .insert(notificationLogs)
    .values({
      sentBy: adminId,
      templateKey,
      audienceSpec: audience,
      recipientCount: recipients.length,
      isTest,
    })
    .returning({ id: notificationLogs.id });
  const logId = inserted[0]!.id;

  const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';
  const from = process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>';

  let succeeded = 0;
  let failed = 0;

  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      for (const r of batch) {
        let prediccionesLink = `${baseUrl}/predicciones`;
        let triviasLink = `${baseUrl}/trivias`;
        if (r.userId) {
          const token = generateMagicToken(r.userId, '');
          prediccionesLink = `${baseUrl}/auth/magic?token=${token}&next=/predicciones`;
          triviasLink = `${baseUrl}/auth/magic?token=${token}&next=/trivias`;
        }
        const html = tpl.render({ name: r.name, prediccionesLink, triviasLink });
        try {
          await resend.emails.send({
            from,
            to: r.email,
            subject: tpl.subject,
            html,
          });
          succeeded++;
        } catch (err) {
          failed++;
          console.error('[notifications/send] resend failed', r.email, err);
          await db.insert(auditLog).values({
            eventType: 'admin_notification_send_failed',
            userId: r.userId,
            payload: { email: r.email, templateKey, error: String(err) },
          });
        }
      }
      if (i + BATCH_SIZE < recipients.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }
  } finally {
    await db
      .update(notificationLogs)
      .set({ succeededCount: succeeded, failedCount: failed, completedAt: new Date() })
      .where(eq(notificationLogs.id, logId));
  }

  await db.insert(auditLog).values({
    eventType: 'admin_notification_sent',
    userId: adminId,
    payload: { logId, templateKey, recipientCount: recipients.length, succeeded, failed, isTest },
  });

  return NextResponse.json({ logId, recipientCount: recipients.length, succeeded, failed });
}
