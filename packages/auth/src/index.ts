import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { Resend as ResendClient } from 'resend';
import { eq } from 'drizzle-orm';
import { db } from '@brakestation/db';
import { users, accounts, sessions, verificationTokens } from '@brakestation/db/schema';
import { generateMagicToken } from './magic-link';

export { generateMagicToken, verifyMagicToken } from './magic-link';

const resendClient = new ResendClient(process.env.RESEND_API_KEY);

const DEFAULT_BASE_URL = 'https://goleadora.brakestation.com.mx';

function safeRelativePath(raw: string | null | undefined, baseUrl: string): string {
  if (!raw) return '/activar';
  try {
    if (raw.startsWith('/') && !raw.startsWith('//')) return raw;
    const u = new URL(raw);
    if (`${u.protocol}//${u.host}` === baseUrl) return `${u.pathname}${u.search}`;
  } catch {
    // fall through
  }
  return '/activar';
}

async function findOrCreateUserId(email: string): Promise<string> {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true },
  });
  if (existing) return existing.id;
  const inserted = await db.insert(users).values({ email }).returning({ id: users.id });
  return inserted[0]!.id;
}

// The adapter type expects snake_case JS property names (refresh_token, access_token, …)
// but Drizzle uses camelCase JS keys while keeping correct snake_case SQL column names.
// Both forms work identically at runtime; cast to satisfy the adapter's type constraint.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const accountsTable = accounts as any;

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
      // The default NextAuth Resend flow stores a single-use token in
      // verification_tokens. Corporate email scanners (Microsoft Defender,
      // Google) and Resend click-tracking can prefetch the link and burn
      // the token before the human clicks, producing ?error=Verification.
      // We override here to send a stateless HMAC link to /auth/magic
      // instead, which is multi-click safe.
      sendVerificationRequest: async ({ identifier: email, url }) => {
        const baseUrl = (process.env.NEXTAUTH_URL || process.env.AUTH_URL || DEFAULT_BASE_URL).replace(/\/$/, '');
        const callbackParam = (() => {
          try { return new URL(url).searchParams.get('callbackUrl'); } catch { return null; }
        })();
        const nextPath = safeRelativePath(callbackParam, baseUrl);

        const userId = await findOrCreateUserId(email);
        const magicToken = generateMagicToken(userId, '');
        const magicUrl = `${baseUrl}/auth/magic?${new URLSearchParams({ token: magicToken, next: nextPath })}`;

        await resendClient.emails.send({
          from: process.env.EMAIL_FROM || 'Brake Station <no-reply@brakestation.com.mx>',
          to: email,
          subject: 'Activa tu boleto — Dinámica Goleadora CanaBRAKE',
          html: buildMagicLinkHtml(magicUrl),
        });
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith(`${baseUrl}/api/auth/`)) return url;

      if (url.includes('/q/') || url.includes('/verifica/')) {
        if (url.startsWith('/')) return `${baseUrl}${url}`;
        if (new URL(url).origin === baseUrl) return url;
      }

      return `${baseUrl}/activar`;
    },

    async session({ session, user }) {
      if (session.user && user) {
        const u = user as unknown as { id: string; isAdmin?: boolean };
        session.user.id = u.id;
        session.user.isAdmin = Boolean(u.isAdmin);
      }
      return session;
    },
  },
  session: {
    strategy: 'database',
  },
  pages: {
    signIn: '/activar',
    verifyRequest: '/activar/verificar',
  },
});

function buildMagicLinkHtml(url: string): string {
  const header = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#0a1e3d 0%,#3A63A8 100%);padding:24px 32px;"><tr><td align="center"><img src="https://assets.brakestation.com.mx/images/logo_gbs.png" alt="Brake Station" width="140" height="68" style="display:inline-block;border:0;height:auto;max-width:140px;vertical-align:middle;" /><span style="display:inline-block;color:#FFFFFF;font-size:22px;font-weight:300;margin:0 14px;vertical-align:middle;">×</span><img src="https://assets.brakestation.com.mx/images/logo_cana.png" alt="CanaBRAKE" width="70" height="70" style="display:inline-block;border:0;height:auto;max-width:70px;vertical-align:middle;" /></td></tr><tr><td align="center" style="padding-top:14px;"><p style="margin:0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Dinámica Goleadora · Mundial 2026</p></td></tr></table>';
  const footer = '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#232124;padding:24px 32px;"><tr><td align="center"><p style="margin:0 0 8px 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">Brake Station · Centro de Distribución oficial CanaBRAKE</p><p style="margin:0;color:rgba(255,255,255,0.40);font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="https://goleadora.brakestation.com.mx" style="color:rgba(255,255,255,0.70);text-decoration:underline;">goleadora.brakestation.com.mx</a></p></td></tr></table>';
  const button = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" bgcolor="#E32125" style="border-radius:8px;background-color:#E32125;"><a href="${url}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">Ingresar a la Dinámica →</a></td></tr></table>`;

  return [
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>',
    '<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">',
    '<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">Tu acceso a la Dinámica Goleadora del Mundial 2026</div>',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F4F4;"><tr><td align="center" style="padding:32px 16px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">',
    `<tr><td>${header}</td></tr>`,
    '<tr><td style="padding:40px 32px;color:#232124;font-family:Arial,Helvetica,sans-serif;">',
    '<h1 style="margin:0 0 16px 0;color:#232124;font-size:26px;font-weight:900;line-height:1.2;">¡Vive el <span style="color:#E32125;">Mundial</span> con <span style="color:#E32125;">CanaBRAKE</span>!</h1>',
    '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Da click en el botón para acceder a la Dinámica Goleadora. El enlace es válido por <strong>24 horas</strong>.</p>',
    button,
    '<p style="margin:32px 0 0 0;color:#888;font-size:13px;line-height:1.6;border-top:1px solid #E5E5E5;padding-top:24px;">Si tú no solicitaste este acceso, puedes ignorar este correo.</p>',
    `<div style="margin-top:24px;padding:16px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;"><p style="margin:0;color:#4a4a4a;font-size:13px;"><strong style="color:#3A63A8;">¿Problemas con el botón?</strong><br>Copia y pega:<br><span style="word-break:break-all;color:#3A63A8;">${url}</span></p></div>`,
    '</td></tr>',
    `<tr><td>${footer}</td></tr>`,
    '</table></td></tr></table></body></html>',
  ].join('');
}
