import { getAdminUserId } from '@/lib/admin-auth';
import { db } from '@brakestation/db';
import { users, adminActions } from '@brakestation/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
  name: z.string().min(2).max(120).trim(),
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const sym = '!@#$%&*';
  let p = '';
  for (let i = 0; i < 11; i++) p += chars[Math.floor(Math.random() * chars.length)];
  p += sym[Math.floor(Math.random() * sym.length)];
  return p;
}

export async function POST(req: Request) {
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: 'invalid_input', message: 'Email o nombre inválido' }, { status: 400 });

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  const existing = await db.query.users.findFirst({ where: eq(users.email, parsed.data.email) });

  if (existing) {
    await db.update(users).set({
      isAdmin: true,
      adminPasswordHash: hash,
      mustChangePassword: true,
      name: existing.name ?? parsed.data.name,
    }).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({
      email: parsed.data.email,
      name: parsed.data.name,
      isAdmin: true,
      adminPasswordHash: hash,
      mustChangePassword: true,
      emailVerified: new Date(),
    });
  }

  await db.insert(adminActions).values({
    adminId,
    action: 'invite_admin',
    targetTable: 'users',
    targetId: parsed.data.email,
    afterState: { email: parsed.data.email, name: parsed.data.name },
  });

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const loginUrl = 'https://goleadora.brakestation.com.mx/admin/login';
    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
      to: parsed.data.email,
      subject: 'Tu acceso admin a Dinámica Goleadora',
      html: [
        '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"></head>',
        '<body style="margin:0;padding:0;background:#F4F4F4;font-family:Arial,sans-serif;">',
        '<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F4F4F4;padding:32px 16px;"><tr><td align="center">',
        '<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border-radius:12px;overflow:hidden;">',
        '<tr><td style="background:linear-gradient(135deg,#0a1e3d 0%,#3A63A8 100%);padding:24px 32px;text-align:center;">',
        '<img src="https://assets.brakestation.com.mx/images/logo_gbs.png" alt="Brake Station" width="160" style="display:inline-block;" />',
        '<p style="color:#FFFFFF;font-size:12px;letter-spacing:2px;text-transform:uppercase;margin:16px 0 0 0;">Panel Administrativo</p>',
        '</td></tr>',
        `<tr><td style="padding:40px 32px;">`,
        `<h1 style="margin:0 0 16px 0;color:#232124;font-size:24px;">Hola ${parsed.data.name},</h1>`,
        '<p style="color:#4a4a4a;font-size:15px;line-height:1.6;">Te han invitado como administrador de la Dinámica Goleadora CanaBRAKE × Brake Station.</p>',
        '<div style="background:#F4F4F4;border-left:4px solid #E32125;padding:16px;border-radius:4px;margin:24px 0;">',
        `<p style="margin:4px 0;color:#232124;"><strong>URL:</strong> <a href="${loginUrl}" style="color:#3A63A8;">${loginUrl}</a></p>`,
        `<p style="margin:4px 0;color:#232124;"><strong>Contraseña temporal:</strong> <code style="background:#FFFFFF;padding:4px 8px;border-radius:4px;font-family:Courier New,monospace;">${tempPassword}</code></p>`,
        '</div>',
        '<p style="color:#4a4a4a;font-size:14px;">Al ingresar por primera vez, te pedirá cambiar esta contraseña (mínimo 12 caracteres).</p>',
        '</td></tr>',
        '<tr><td style="background:#232124;padding:24px 32px;text-align:center;"><p style="margin:0;color:rgba(255,255,255,0.85);font-size:13px;">Brake Station · Centro de Distribución oficial CanaBRAKE</p></td></tr>',
        '</table></td></tr></table></body></html>',
      ].join(''),
    });
  } catch (e) {
    console.error('[invite-admin] email send failed', e);
  }

  return Response.json({ ok: true, tempPassword });
}
