import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import Resend from 'next-auth/providers/resend';
import { db } from '@brakestation/db';
import { users, accounts, sessions, verificationTokens } from '@brakestation/db/schema';
import { generateMagicToken } from './magic-link';
import { SITE_URL, EMAIL_FROM, linkEmailHtml, sendEmail } from './email';

export * from './email';
export { generateMagicToken, verifyMagicToken, type MagicPurpose } from './magic-link';



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
    // Auth.js necesita un provider para leer sesiones de DB, pero el envío del
    // link NO pasa por aquí: lo hace POST /api/entrar (Turnstile + rate limit)
    // con un link HMAC stateless a /auth/magic que aguanta los prefetch de los
    // scanners de correo. Se bloquea /api/auth/signin/resend para que no sea un
    // atajo sin Turnstile.
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: EMAIL_FROM,
      sendVerificationRequest: async () => {
        throw new Error('Usa POST /api/entrar para pedir el link de acceso');
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/') && !url.startsWith('//') && !url.includes('\\')) return `${baseUrl}${url}`;
      // Comparar origin exacto: startsWith dejaría pasar "https://copa...mx.evil.com".
      try {
        if (new URL(url).origin === baseUrl) return url;
      } catch {
        // URL inválida: cae al default
      }
      return `${baseUrl}/dashboard`;
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
    signIn: '/entrar',
    verifyRequest: '/entrar/revisa-tu-correo',
  },
});

/** Manda el link de acceso de participante (válido 24 h, multi-click). */
export async function sendLoginLink(userId: string, email: string, next = '/dashboard'): Promise<void> {
  const token = generateMagicToken(userId, 'login');
  const url = `${SITE_URL}/auth/magic?${new URLSearchParams({ token, next })}`;
  await sendEmail({
    to: email,
    subject: 'Tu acceso a la Quiniela Copa Brake Station',
    html: linkEmailHtml({
      url,
      preheader: 'Tu link para entrar a la Quiniela Copa Brake Station',
      title: 'Ya casi estás dentro',
      body: 'Da clic en el botón para entrar a la quiniela. El link sirve durante <strong>24 horas</strong> y lo puedes usar más de una vez.',
      cta: 'Entrar a la quiniela',
    }),
  });
}

/** Link para que un admin de ADMIN_EMAILS cree su contraseña. */
export async function sendAdminSetupLink(userId: string, email: string): Promise<void> {
  const token = generateMagicToken(userId, 'admin_setup');
  const url = `${SITE_URL}/api/admin/setup?${new URLSearchParams({ token })}`;
  await sendEmail({
    to: email,
    subject: 'Crea tu contraseña de admin · Copa Brake Station',
    html: linkEmailHtml({
      url,
      preheader: 'Crea tu contraseña del panel admin',
      title: 'Activa tu acceso de administrador',
      body: 'Tu correo está registrado como administrador de la quiniela. Da clic en el botón para crear tu contraseña. El link vence en 24 horas.',
      cta: 'Crear contraseña',
    }),
  });
}
