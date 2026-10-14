// Verificación server-side de Cloudflare Turnstile.
// Sin TURNSTILE_SECRET_KEY (dev local) se omite la verificación.
export async function verifyTurnstile(token: string | undefined | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[turnstile] TURNSTILE_SECRET_KEY no configurada en producción');
      return false;
    }
    return true;
  }
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] siteverify falló', err);
    return false;
  }
}
