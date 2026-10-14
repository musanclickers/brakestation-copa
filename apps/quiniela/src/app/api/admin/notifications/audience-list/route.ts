import { getAdminUserId } from '@/lib/admin-auth';
import { resolveAudience, type AudienceSpec } from '@/lib/notification-audiences';
import { getTemplate } from '@/lib/notification-templates';
import { generateMagicToken } from '@brakestation/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function normalizePhoneForWa(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D+/g, '');
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
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
  const { spec, templateKey } = body as { spec: AudienceSpec; templateKey: string };
  if (!spec || typeof spec !== 'object' || !('kind' in spec)) {
    return NextResponse.json({ error: 'spec_required' }, { status: 400 });
  }
  const tpl = getTemplate(templateKey);
  if (!tpl) return NextResponse.json({ error: 'unknown_template' }, { status: 404 });
  if (!tpl.renderWhatsApp) {
    return NextResponse.json({ error: 'template_has_no_whatsapp' }, { status: 400 });
  }

  const recipients = await resolveAudience(spec);
  const baseUrl = process.env.NEXTAUTH_URL || 'https://goleadora.brakestation.com.mx';

  const rows = recipients.map((r) => {
    const waPhone = normalizePhoneForWa(r.phone);
    let magicLink: string | undefined;
    if (r.userId) {
      const token = generateMagicToken(r.userId, '');
      magicLink = `${baseUrl}/auth/magic?token=${token}`;
    }
    const waText = tpl.renderWhatsApp!({ name: r.name, magicLink });
    return {
      userId: r.userId,
      name: r.name,
      email: r.email,
      cohort: r.cohort,
      ticketCode: r.ticketCode,
      rawPhone: r.phone,
      waPhone,
      waText,
    };
  });

  return NextResponse.json({ count: rows.length, recipients: rows });
}
