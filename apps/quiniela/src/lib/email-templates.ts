import { wrapBranded, escapeHtml, SITE_URL } from '@brakestation/auth/email';
import { LOCKOUT_MINUTES } from '@brakestation/db/phases';

export type ComprobantePick = { home: string; away: string; h: number; a: number };

export function comprobanteHtml(args: {
  phase: string;
  shortcode: string;
  submittedAt: Date;
  picks: ComprobantePick[];
}): string {
  const dateStr = args.submittedAt.toLocaleString('es-MX', { timeZone: 'America/Merida' });
  const verifyUrl = `${SITE_URL}/verifica/${args.shortcode}`;
  const rows = args.picks
    .map(
      (p) =>
        `<tr><td style="padding:8px 0;color:#232124;font-size:13px;border-bottom:1px solid #E5E5E5;">${escapeHtml(p.home)}<br><span style="color:#888;">vs</span> ${escapeHtml(p.away)}</td><td align="right" style="padding:8px 0;color:#0a1e3d;font-weight:900;font-size:18px;font-family:Courier New,monospace;border-bottom:1px solid #E5E5E5;white-space:nowrap;">${p.h} - ${p.a}</td></tr>`,
    )
    .join('');

  return wrapBranded(`Guardamos tus pronósticos de ${args.phase}`, [
    '<h1 style="margin:0 0 8px 0;color:#0a1e3d;font-size:24px;font-weight:900;text-align:center;">Pronósticos guardados</h1>',
    `<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;text-align:center;">Así quedaron tus pronósticos de <strong>${escapeHtml(args.phase)}</strong>.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:24px;">${rows}</table>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F4F4;border-radius:8px;margin-bottom:24px;"><tr><td style="padding:16px 20px;">',
    `<p style="margin:0 0 6px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Sello</p><p style="margin:0 0 12px 0;color:#E32125;font-weight:700;font-family:Courier New,monospace;font-size:18px;">${args.shortcode}</p>`,
    `<p style="margin:0;color:#4a4a4a;font-size:13px;">Guardado el ${dateStr} (hora de Mérida)</p>`,
    '</td></tr></table>',
    `<p style="margin:0 0 24px 0;text-align:center;"><a href="${verifyUrl}" style="color:#3A63A8;text-decoration:underline;font-weight:600;">Ver mi comprobante →</a></p>`,
    `<p style="border-top:1px solid #E5E5E5;padding-top:16px;color:#666;font-size:12px;line-height:1.6;">Puedes cambiar cada pronóstico hasta ${LOCKOUT_MINUTES} minutos antes de que empiece ese partido. Si lo cambias, te llega un comprobante nuevo con otro sello y el anterior deja de valer.</p>`,
  ].join(''));
}
