import { getAdminUserId } from '@/lib/admin-auth';
import { getTemplate } from '@/lib/notification-templates';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const { templateKey, sampleName } = body as { templateKey: string; sampleName?: string };
  const tpl = getTemplate(templateKey);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 404 });

  const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';
  const html = tpl.render({
    name: sampleName?.trim() || 'Eduardo',
    prediccionesLink: `${baseUrl}/predicciones`,
    triviasLink: `${baseUrl}/trivias`,
  });

  return NextResponse.json({ subject: tpl.subject, preheader: tpl.preheader, html });
}
