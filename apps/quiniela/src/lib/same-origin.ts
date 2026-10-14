// Defensa CSRF para POST/PATCH custom: el navegador siempre manda Origin en
// peticiones cross-site, así que basta comparar contra el host de la app.
// Se usa junto con cookies SameSite=lax.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return false;
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host');
  try {
    const originHost = new URL(origin).host;
    if (originHost === host) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    return Boolean(site) && originHost === new URL(site!).host;
  } catch {
    return false;
  }
}

export function forbiddenOrigin(): Response {
  return Response.json({ error: 'bad_origin' }, { status: 403 });
}
