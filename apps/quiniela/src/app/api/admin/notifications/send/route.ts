import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { db } from '@brakestation/db';
import { notificationLogs, auditLog } from '@brakestation/db/schema';
import { AudienceSchema, resolveAudience } from '@/lib/notification-audiences';
import { getTemplate } from '@/lib/notification-templates';
import { generateMagicToken, SITE_URL, sendEmail } from '@brakestation/auth';
import { and, eq, gt, isNotNull } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

const SendSchema = z.object({
  templateKey: z.string(),
  audience: AudienceSchema,
  force: z.boolean().optional(),
});

// ponytail: envío secuencial con pausa entre lotes para no topar el rate limit
// de Resend. Para miles de destinatarios, mover a la API batch de Resend.
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 2000;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = SendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'validation', details: parsed.error.issues }, { status: 400 });
  const { templateKey, audience, force } = parsed.data;

  const tpl = getTemplate(templateKey);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 404 });

  const isTest = audience.kind === 'test';

  // Evita mandar dos veces la misma plantilla por accidente (doble clic, dos admins).
  if (!isTest && !force) {
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recent = await db
      .select({ completedAt: notificationLogs.completedAt })
      .from(notificationLogs)
      .where(and(eq(notificationLogs.templateKey, templateKey), eq(notificationLogs.isTest, false), isNotNull(notificationLogs.completedAt), gt(notificationLogs.completedAt, sixHoursAgo)))
      .limit(1);
    if (recent.length > 0) {
      return NextResponse.json({ error: 'recent_send_exists', requireForce: true, lastSentAt: recent[0]!.completedAt?.toISOString() ?? null }, { status: 409 });
    }
  }

  const recipients = await resolveAudience(audience);
  if (recipients.length === 0) return NextResponse.json({ error: 'empty_audience' }, { status: 400 });

  const inserted = await db
    .insert(notificationLogs)
    .values({ sentBy: adminId, templateKey, audienceSpec: audience, recipientCount: recipients.length, isTest })
    .returning({ id: notificationLogs.id });
  const logId = inserted[0]!.id;

  let succeeded = 0;
  let failed = 0;
  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      for (const r of recipients.slice(i, i + BATCH_SIZE)) {
        // Link con sesión incluida para que no tengan que pedir otro correo.
        const quinielaLink = r.userId
          ? `${SITE_URL}/auth/magic?${new URLSearchParams({ token: generateMagicToken(r.userId, 'login'), next: '/quiniela' })}`
          : `${SITE_URL}/entrar`;
        try {
          await sendEmail({ to: r.email, subject: tpl.subject, html: tpl.render({ name: r.name, quinielaLink }) });
          succeeded++;
        } catch (err) {
          failed++;
          console.error('[notifications/send] resend failed', r.email, err);
          await db.insert(auditLog).values({ eventType: 'admin_notification_send_failed', userId: r.userId, payload: { email: r.email, templateKey, error: String(err) } });
        }
      }
      if (i + BATCH_SIZE < recipients.length) await sleep(BATCH_DELAY_MS);
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
