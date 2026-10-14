const HEADER = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#0a1e3d 0%,#3A63A8 100%);padding:24px 32px;">
  <tr>
    <td align="center">
      <img src="https://assets.brakestation.com.mx/images/logo_gbs.png" alt="Brake Station" width="140" height="68" style="display:inline-block;border:0;height:auto;max-width:140px;vertical-align:middle;" />
      <span style="display:inline-block;color:#FFFFFF;font-size:22px;font-weight:300;margin:0 14px;vertical-align:middle;">×</span>
      <img src="https://assets.brakestation.com.mx/images/logo_cana.png" alt="CanaBRAKE" width="70" height="70" style="display:inline-block;border:0;height:auto;max-width:70px;vertical-align:middle;" />
    </td>
  </tr>
  <tr>
    <td align="center" style="padding-top:14px;">
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;font-family:Arial,Helvetica,sans-serif;">
        Dinámica Goleadora · Mundial 2026
      </p>
    </td>
  </tr>
</table>`;

const FOOTER = `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#232124;padding:24px 32px;">
  <tr>
    <td align="center">
      <p style="margin:0 0 8px 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:600;font-family:Arial,Helvetica,sans-serif;">
        Brake Station · Centro de Distribución oficial CanaBRAKE
      </p>
      <p style="margin:0 0 12px 0;color:rgba(255,255,255,0.55);font-size:11px;font-family:Arial,Helvetica,sans-serif;">
        Mérida · Villahermosa · Tuxtla
      </p>
      <p style="margin:0;color:rgba(255,255,255,0.40);font-size:11px;font-family:Arial,Helvetica,sans-serif;">
        <a href="https://goleadora.brakestation.com.mx" style="color:rgba(255,255,255,0.70);text-decoration:underline;">goleadora.brakestation.com.mx</a>
      </p>
    </td>
  </tr>
</table>`;

export function emailButton(href: string, text: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td align="center" bgcolor="#E32125" style="border-radius:8px;background-color:#E32125;">
      <a href="${href}" style="display:inline-block;padding:14px 32px;color:#FFFFFF;font-weight:700;font-size:15px;text-decoration:none;border-radius:8px;font-family:Arial,Helvetica,sans-serif;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

export function wrapBranded(preheader: string, body: string): string {
  return [
    '<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dinámica Goleadora CanaBRAKE</title></head>',
    '<body style="margin:0;padding:0;background-color:#F4F4F4;font-family:Arial,Helvetica,sans-serif;">',
    `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F4F4;">',
    '<tr><td align="center" style="padding:32px 16px;">',
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;background-color:#FFFFFF;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.08);">',
    `<tr><td>${HEADER}</td></tr>`,
    `<tr><td style="padding:40px 32px;color:#232124;font-family:Arial,Helvetica,sans-serif;">${body}</td></tr>`,
    `<tr><td>${FOOTER}</td></tr>`,
    '</table>',
    '<p style="margin:16px 0 0 0;color:#666666;font-size:11px;text-align:center;font-family:Arial,Helvetica,sans-serif;">© 2026 Brake Station · Todos los derechos reservados</p>',
    '</td></tr></table>',
    '</body></html>',
  ].join('');
}
