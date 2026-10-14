// Wrapper de marca y envío de todos los emails (magic link, comprobantes, avisos).
import { Resend } from 'resend';

// Lazy: crear el cliente al importar truena el build de Next sin RESEND_API_KEY.
let client: Resend | null = null;
export async function sendEmail(o: { to: string; subject: string; html: string }): Promise<void> {
  client ??= new Resend(process.env.RESEND_API_KEY);
  const { error } = await client.emails.send({ from: EMAIL_FROM, ...o });
  if (error) throw new Error(`Resend: ${error.message}`);
}

export const SITE_URL = (
  process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://copa.brakestation.com.mx'
).replace(/\/$/, '');

export const EMAIL_FROM = process.env.EMAIL_FROM || 'Copa Brake Station <no-reply@brakestation.com.mx>';

const SITE_HOST = SITE_URL.replace(/^https?:\/\//, '');

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function emailButton(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;"><tr><td align="center" bgcolor="#E32125" style="border-radius:8px;background-color:#E32125;"><a href="${href}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">${text}</a></td></tr></table>`;
}

export function wrapBranded(preheader: string, body: string): string {
  const header = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#0a1e3d 0%,#14306a 100%);padding:24px 32px;"><tr><td align="center"><img src="${SITE_URL}/images/logo-copa-email.png" alt="Copa Brake Station" width="120" height="120" style="display:inline-block;border:0;height:auto;max-width:120px;" /></td></tr><tr><td align="center" style="padding-top:12px;"><p style="margin:0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">Copa Brake Station · Primera Edición 2026</p></td></tr></table>`;
  const footer = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#0a1e3d;padding:24px 32px;"><tr><td align="center"><p style="margin:0 0 8px 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">Quiniela Copa Brake Station · Primera Edición 2026</p><p style="margin:0;color:rgba(255,255,255,0.40);font-size:11px;font-family:Arial,Helvetica,sans-serif;"><a href="${SITE_URL}" style="color:rgba(255,255,255,0.70);text-decoration:underline;">${SITE_HOST}</a></p></td></tr></table>`;
  return [
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Copa Brake Station</title></head>',
    '<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">',
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F4F4;"><tr><td align="center" style="padding:32px 16px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">',
    `<tr><td>${header}</td></tr>`,
    `<tr><td style="padding:40px 32px;color:#232124;font-family:Arial,Helvetica,sans-serif;">${body}</td></tr>`,
    `<tr><td>${footer}</td></tr>`,
    '</table></td></tr></table></body></html>',
  ].join('');
}

/** Cuerpo estándar de un email con link (acceso, alta de admin, recordatorio). */
export function linkEmailHtml(o: { url: string; preheader: string; title: string; body: string; cta: string }): string {
  return wrapBranded(o.preheader, [
    `<h1 style="margin:0 0 16px 0;color:#0a1e3d;font-size:26px;font-weight:900;line-height:1.2;">${o.title}</h1>`,
    `<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">${o.body}</p>`,
    emailButton(o.url, `${o.cta} →`),
    '<p style="margin:32px 0 0 0;color:#888;font-size:13px;line-height:1.6;border-top:1px solid #E5E5E5;padding-top:24px;">Si no pediste este correo, ignóralo. Nadie puede entrar a tu cuenta sin este link.</p>',
    `<div style="margin-top:24px;padding:16px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;"><p style="margin:0;color:#4a4a4a;font-size:13px;"><strong style="color:#3A63A8;">¿No funciona el botón?</strong><br>Copia y pega este link en tu navegador:<br><span style="word-break:break-all;color:#3A63A8;">${o.url}</span></p></div>`,
  ].join(''));
}
