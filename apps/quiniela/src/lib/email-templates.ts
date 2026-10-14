import { wrapBranded, emailButton } from './email-branded-wrapper';

export function magicLinkHtml(url: string): string {
  return wrapBranded('Tu acceso a la Dinámica Goleadora del Mundial 2026', [
    '<h1 style="margin:0 0 16px 0;color:#232124;font-size:26px;font-weight:900;line-height:1.2;">¡Vive el <span style="color:#E32125;">Mundial</span> con <span style="color:#E32125;">CanaBRAKE</span>!</h1>',
    '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Da click en el botón para acceder a la Dinámica Goleadora. El enlace es válido por <strong>24 horas</strong>.</p>',
    emailButton(url, 'Ingresar a la Dinámica →'),
    '<p style="margin:32px 0 0 0;color:#888888;font-size:13px;line-height:1.6;border-top:1px solid #E5E5E5;padding-top:24px;">Si tú no solicitaste este acceso, puedes ignorar este correo.</p>',
    `<div style="margin-top:24px;padding:16px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;"><p style="margin:0;color:#4a4a4a;font-size:13px;"><strong style="color:#3A63A8;">¿Problemas con el botón?</strong><br>Copia y pega esta liga:<br><span style="word-break:break-all;color:#3A63A8;">${url}</span></p></div>`,
  ].join(''));
}

export function comprobanteHtml(args: {
  ticket_code: string;
  phase: string;
  phase_seal: string;
  shortcode: string;
  submitted_at: Date;
}): string {
  const dateStr = args.submitted_at.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
  const verifyUrl = `https://goleadora.brakestation.com.mx/verifica/${args.shortcode}`;

  return wrapBranded(`Predicciones de ${args.phase} selladas — boleto ${args.ticket_code}`, [
    '<div style="text-align:center;padding-bottom:24px;"><div style="display:inline-block;background-color:#10b981;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;"><span style="color:#FFFFFF;font-size:28px;">✓</span></div></div>',
    '<h1 style="margin:0 0 8px 0;color:#232124;font-size:24px;font-weight:900;text-align:center;">¡Predicciones selladas!</h1>',
    `<p style="margin:0 0 28px 0;color:#4a4a4a;font-size:15px;line-height:1.6;text-align:center;">Tus predicciones de <strong>${args.phase}</strong> quedaron registradas con sello digital inmutable.</p>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F4F4;border-radius:8px;margin-bottom:24px;">',
    '<tr><td style="padding:20px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">',
    `<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;" width="40%">Boleto</td><td style="padding:8px 0;color:#232124;font-weight:700;font-family:Courier New,monospace;">${args.ticket_code}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Fase</td><td style="padding:8px 0;color:#232124;font-weight:600;">${args.phase}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Sello</td><td style="padding:8px 0;color:#E32125;font-weight:700;font-family:Courier New,monospace;font-size:16px;">${args.shortcode}</td></tr>`,
    `<tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Sellado</td><td style="padding:8px 0;color:#232124;font-size:13px;">${dateStr}</td></tr>`,
    '</table></td></tr></table>',
    `<p style="margin:0 0 24px 0;text-align:center;"><a href="${verifyUrl}" style="color:#3A63A8;text-decoration:underline;font-weight:600;">Verificar mi sello →</a></p>`,
    '<p style="border-top:1px solid #E5E5E5;padding-top:16px;color:#666;font-size:12px;line-height:1.6;"><strong>Importante:</strong> una vez selladas, tus predicciones NO pueden modificarse.</p>',
  ].join(''));
}

export function approvedHtml(ticketCode: string, magicLink?: string): string {
  const ctaUrl = magicLink ?? 'https://goleadora.brakestation.com.mx/dashboard';
  const ctaText = magicLink ? 'Llenar mi quiniela →' : 'Ir al dashboard →';
  return wrapBranded(`Tu boleto ${ticketCode} fue aprobado`, [
    '<div style="text-align:center;padding-bottom:24px;"><div style="display:inline-block;background-color:#10b981;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;"><span style="color:#FFFFFF;font-size:28px;">✓</span></div></div>',
    `<h1 style="margin:0 0 16px 0;color:#232124;font-size:24px;font-weight:900;text-align:center;">¡Tu boleto ${ticketCode} está activo!</h1>`,
    '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;text-align:center;">Tu registro fue verificado exitosamente. Ya puedes participar en la Dinámica Goleadora CanaBRAKE.</p>',
    emailButton(ctaUrl, ctaText),
    magicLink ? '<p style="margin:16px 0 0 0;color:#888;font-size:12px;text-align:center;">Este enlace es válido por 24 horas. Si expira, inicia sesión normalmente en goleadora.brakestation.com.mx</p>' : '',
  ].join(''));
}

export function rejectedHtml(ticketCode: string, notes?: string): string {
  const reasonBlock = notes
    ? `<div style="margin:16px 0 24px 0;background-color:#FFF5F5;border-left:3px solid #E32125;padding:16px;border-radius:4px;"><p style="margin:0;color:#991B1B;font-size:14px;"><strong>Motivo:</strong> ${notes}</p></div>`
    : '';

  return wrapBranded(`Tu boleto ${ticketCode} necesita corrección`, [
    '<div style="text-align:center;padding-bottom:24px;"><div style="display:inline-block;background-color:#EF4444;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;"><span style="color:#FFFFFF;font-size:28px;">✗</span></div></div>',
    `<h1 style="margin:0 0 16px 0;color:#232124;font-size:24px;font-weight:900;text-align:center;">Registro del boleto ${ticketCode} rechazado</h1>`,
    '<p style="margin:0 0 8px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Tu registro no pudo ser aprobado.</p>',
    reasonBlock,
    '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Puedes reintentar tu registro con una nueva foto:</p>',
    emailButton(`https://goleadora.brakestation.com.mx/activar?ticket=${ticketCode}`, 'Reintentar registro →'),
  ].join(''));
}

export function reminderHtml(ticketCode: string, phaseLabel: string, magicLink: string): string {
  return wrapBranded(`Recuerda sellar tus pronósticos — ${phaseLabel}`, [
    '<div style="text-align:center;padding-bottom:24px;"><div style="display:inline-block;background-color:#F59E0B;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;"><span style="color:#FFFFFF;font-size:28px;">⏰</span></div></div>',
    `<h1 style="margin:0 0 16px 0;color:#232124;font-size:24px;font-weight:900;text-align:center;">¡No te quedes fuera!</h1>`,
    `<p style="margin:0 0 8px 0;color:#4a4a4a;font-size:15px;line-height:1.6;text-align:center;">Aún no has sellado tus pronósticos de <strong>${phaseLabel}</strong> para el boleto <strong>${ticketCode}</strong>.</p>`,
    '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;text-align:center;">Entra y completa tus predicciones antes de que cierre la fase.</p>',
    emailButton(magicLink, 'Sellar mis pronósticos →'),
    '<p style="margin:16px 0 0 0;color:#888;font-size:12px;text-align:center;">Este enlace es válido por 24 horas.</p>',
  ].join(''));
}
