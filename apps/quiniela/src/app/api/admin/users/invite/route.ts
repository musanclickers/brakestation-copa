import { getAdminUserId } from '@/lib/admin-auth';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { db } from '@brakestation/db';
import { users, adminActions } from '@brakestation/db/schema';
import { wrapBranded, emailButton, escapeHtml, SITE_URL, sendEmail } from '@brakestation/auth/email';
import { eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const schema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(2).max(120),
});

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const sym = '!@#$%&*';
  let p = '';
  for (let i = 0; i < 13; i++) p += chars[randomInt(chars.length)];
  return p + sym[randomInt(sym.length)];
}

// Invita (o re-invita, para resetear una contraseña olvidada) a un admin:
// contraseña temporal por correo, se cambia al primer login.
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();
  const adminId = await getAdminUserId();
  if (!adminId) return Response.json({ error: 'forbidden' }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'invalid_input', message: 'Email o nombre inválido' }, { status: 400 });
  const { email, name } = parsed.data;

  const tempPassword = generateTempPassword();
  const hash = await bcrypt.hash(tempPassword, 12);

  const existing = await db.query.users.findFirst({ where: eq(users.email, email) });
  if (existing) {
    await db
      .update(users)
      .set({ isAdmin: true, adminPasswordHash: hash, mustChangePassword: true, name: existing.name ?? name })
      .where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ email, name, isAdmin: true, adminPasswordHash: hash, mustChangePassword: true, emailVerified: new Date() });
  }

  await db.insert(adminActions).values({
    adminId,
    action: 'invite_admin',
    targetTable: 'users',
    targetId: email,
    afterState: { email, name },
  });

  const loginUrl = `${SITE_URL}/admin/login`;
  try {
    await sendEmail({
      to: email,
      subject: 'Tu acceso admin · Quiniela Copa Brake Station',
      html: wrapBranded('Tu acceso al panel admin', [
        `<h1 style="margin:0 0 16px 0;color:#0a1e3d;font-size:24px;">Hola ${escapeHtml(name)},</h1>`,
        '<p style="color:#4a4a4a;font-size:15px;line-height:1.6;">Te dieron acceso como administrador de la Quiniela Copa Brake Station.</p>',
        `<div style="background:#F4F4F4;border-left:4px solid #E32125;padding:16px;border-radius:4px;margin:24px 0;"><p style="margin:4px 0;color:#232124;"><strong>Contraseña temporal:</strong> <code style="background:#FFFFFF;padding:4px 8px;border-radius:4px;font-family:Courier New,monospace;">${tempPassword}</code></p></div>`,
        emailButton(loginUrl, 'Entrar al panel →'),
        '<p style="color:#4a4a4a;font-size:14px;margin-top:24px;">La primera vez que entres te va a pedir una contraseña nueva de al menos 12 caracteres.</p>',
      ].join('')),
    });
  } catch (e) {
    console.error('[invite-admin] email send failed', e);
  }

  return Response.json({ ok: true, tempPassword });
}
