// ponytail: rate limit en memoria del proceso. Vale porque corre un solo
// container; si se escala a varias réplicas, mover a Redis (REDIS_URL).
const buckets = new Map<string, { count: number; resetAt: number }>();

/** true = permitido. Cuenta un intento por llamada dentro de la ventana. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const rec = buckets.get(key);
  if (!rec || now > rec.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (rec.count >= max) return false;
  rec.count++;
  return true;
}

export function resetRateLimit(key: string) {
  buckets.delete(key);
}

export function clientIp(req: Request): string {
  // Cloudflare pone la IP real en cf-connecting-ip; Coolify/Traefik en x-forwarded-for.
  return (
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  );
}
