import crypto from 'node:crypto';

function sortKeysDeep(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sortKeysDeep);
  const record = obj as Record<string, unknown>;
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) {
    sorted[key] = sortKeysDeep(record[key]);
  }
  return sorted;
}

export function canonicalize(payload: Record<string, unknown>): string {
  return JSON.stringify(sortKeysDeep(payload));
}

export function generateSeal(payload: Record<string, unknown>, secret: string): string {
  const canonical = canonicalize(payload);
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

export type MatchPick = {
  match_code: string;
  h: number;
  a: number;
};

/** @deprecated Use generatePhaseSeal instead */
export function generateGlobalSeal(picks: MatchPick[], secret: string): string {
  const sorted = [...picks].sort((a, b) => a.match_code.localeCompare(b.match_code));
  const payload = { v: '1.0', type: 'global_submission', count: sorted.length, picks: sorted };
  return generateSeal(payload, secret);
}

/** @deprecated Use verifyPhaseSeal instead */
export function verifyGlobalSeal(picks: MatchPick[], seal: string, secret: string): boolean {
  const sorted = [...picks].sort((a, b) => a.match_code.localeCompare(b.match_code));
  const payload = { v: '1.0', type: 'global_submission', count: sorted.length, picks: sorted };
  return verifySeal(payload, seal, secret);
}

export function generatePhaseSeal(
  phase: string,
  picks: MatchPick[],
  secret: string,
): string {
  const sorted = [...picks].sort((a, b) => a.match_code.localeCompare(b.match_code));
  return generateSeal(
    { v: '1.0', type: 'phase_submission', phase, count: sorted.length, picks: sorted },
    secret,
  );
}

export function verifyPhaseSeal(
  phase: string,
  picks: MatchPick[],
  seal: string,
  secret: string,
): boolean {
  const sorted = [...picks].sort((a, b) => a.match_code.localeCompare(b.match_code));
  return verifySeal(
    { v: '1.0', type: 'phase_submission', phase, count: sorted.length, picks: sorted },
    seal,
    secret,
  );
}

export function verifySeal(
  payload: Record<string, unknown>,
  sealToCheck: string,
  secret: string,
): boolean {
  if (!/^[0-9a-f]{64}$/.test(sealToCheck)) {
    return false;
  }
  const expected = generateSeal(payload, secret);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(sealToCheck, 'hex'),
  );
}
