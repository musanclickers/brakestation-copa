const WA_URL = process.env.WA_SERVICE_URL || 'http://whatsapp:3001';
const WA_TOKEN = process.env.WA_INTERNAL_TOKEN || '';

export async function sendWhatsApp(_phone: string, _message: string): Promise<boolean> {
  // WhatsApp sending disabled — re-enable when a new number is linked
  return false;
}

export async function getWhatsAppStatus(): Promise<{ connected: boolean; phone: string | null }> {
  try {
    const res = await fetch(`${WA_URL}/status`, {
      headers: WA_TOKEN ? { Authorization: `Bearer ${WA_TOKEN}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { connected: false, phone: null };
    return await res.json();
  } catch {
    return { connected: false, phone: null };
  }
}

export async function logoutWhatsApp(): Promise<boolean> {
  try {
    const res = await fetch(`${WA_URL}/logout`, {
      method: 'POST',
      headers: WA_TOKEN ? { Authorization: `Bearer ${WA_TOKEN}` } : {},
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function getWhatsAppQrUrl(): string {
  const params = WA_TOKEN ? `?token=${WA_TOKEN}` : '';
  return `${WA_URL.replace('http', 'ws')}/qr${params}`;
}
