import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { getTemplate } from '@/lib/notification-templates';
import { SITE_URL } from '@brakestation/auth/email';
import { NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = z.object({ templateKey: z.string(), sampleName: z.string().max(60).optional() }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  const tpl = getTemplate(parsed.data.templateKey);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 404 });

  const html = tpl.render({ name: parsed.data.sampleName?.trim() || 'Víctor', quinielaLink: `${SITE_URL}/quiniela` });
  return NextResponse.json({ subject: tpl.subject, preheader: tpl.preheader, html });
}
