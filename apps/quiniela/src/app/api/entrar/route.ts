import { db } from '@brakestation/db';
import { users, auditLog } from '@brakestation/db/schema';
import { sendLoginLink } from '@brakestation/auth';
import { eq } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { rateLimit, clientIp } from '@/lib/rate-limit';
import { verifyTurnstile } from '@/lib/turnstile';
import { isSameOrigin, forbiddenOrigin } from '@/lib/same-origin';
import { RelacionSchema } from '@/lib/relacion-schema';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Registro y login de participantes en un solo endpoint: si el email es nuevo
// pide nombre + aceptar términos; si ya existe, solo manda el link.
const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  name: z.string().trim().min(2).max(60).optional(),
  terms: z.boolean().optional(),
  relacion: z.string().max(40).optional(),
  relacion_detalle: z.string().max(100).optional(),
  turnstileToken: z.string().max(4096).optional(),
});

const HOUR = 60 * 60 * 1000;

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return forbiddenOrigin();

  const ip = clientIp(req);
  if (!rateLimit(`entrar:ip:${ip}`, 10, HOUR)) {
    return Response.json(
      { error: 'too_many_requests', message: 'Pediste demasiados links. Espera una hora y vuelve a intentar.' },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: 'invalid_input', message: 'Revisa tu correo y tu nombre.' }, { status: 400 });
  }
  const { email, name, terms, turnstileToken } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return Response.json(
      { error: 'captcha_failed', message: 'No pudimos confirmar que eres humano. Recarga la página e intenta de nuevo.' },
      { status: 400 },
    );
  }

  if (!rateLimit(`entrar:email:${email}`, 3, HOUR)) {
    return Response.json(
      { error: 'too_many_requests', message: 'Ya te mandamos varios links a este correo. Revisa tu bandeja (y spam) o espera una hora.' },
      { status: 429 },
    );
  }

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
    columns: { id: true, name: true, termsAcceptedAt: true },
  });

  const needsRegistration = !user?.name || !user.termsAcceptedAt;
  if (needsRegistration && (!name || terms !== true)) {
    return Response.json(
      { error: 'needs_registration', message: 'Es tu primera vez: escribe tu nombre y acepta el reglamento.' },
      { status: 400 },
    );
  }

  // Solo se pide al registrarse; el login de alguien ya registrado no la manda.
  let rel: { relacion: string; relacionDetalle: string | null } | undefined;
  if (needsRegistration) {
    const r = RelacionSchema.safeParse({ relacion: parsed.data.relacion, relacion_detalle: parsed.data.relacion_detalle });
    if (!r.success) {
      const otro = r.error.issues.some((i) => i.path[0] === 'relacion_detalle');
      return Response.json(
        {
          error: 'invalid_relacion',
          message: otro ? r.error.issues[0]!.message : 'Elige cuál es tu relación con la Copa.',
        },
        { status: 400 },
      );
    }
    rel = { relacion: r.data.relacion, relacionDetalle: r.data.relacion_detalle };
  }

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ email, name, termsAcceptedAt: new Date(), registrationIp: ip, ...rel })
      .returning({ id: users.id, name: users.name, termsAcceptedAt: users.termsAcceptedAt });
    user = inserted[0]!;
    await db.insert(auditLog).values({
      eventType: 'registered',
      userId: user.id,
      ipHash: createHash('sha256').update(ip).digest('hex'),
      userAgent: req.headers.get('user-agent')?.slice(0, 300) ?? null,
    });
  } else if (needsRegistration) {
    await db
      .update(users)
      .set({ name: user.name ?? name, termsAcceptedAt: new Date(), registrationIp: ip, ...rel })
      .where(eq(users.id, user.id));
  }

  try {
    await sendLoginLink(user.id, email);
  } catch (err) {
    console.error('[entrar] envío de link falló', err);
    return Response.json(
      { error: 'email_failed', message: 'No pudimos mandar el correo. Intenta de nuevo en unos minutos.' },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
