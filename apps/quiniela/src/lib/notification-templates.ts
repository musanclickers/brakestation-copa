import { wrapBranded, emailButton } from './email-branded-wrapper';
import { waOpeningJ2J3Message, waReminderSealJ3Message } from './whatsapp-messages';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type TemplateRecipientContext = {
  name: string;
  prediccionesLink: string;
  triviasLink: string;
};

export type NotificationTemplate = {
  key: string;
  label: string;
  subject: string;
  preheader: string;
  render(ctx: TemplateRecipientContext): string;
  renderWhatsApp?(ctx: { name: string; magicLink?: string }): string;
};

const triviasOpenJ2J3: NotificationTemplate = {
  key: 'trivias_open_j2_j3',
  label: 'Apertura predicciones + trivias J2 y J3',
  subject: '⚽ J2 y J3 abiertas — captura predicciones y contesta trivias',
  preheader: 'Los partidos de J2 y J3 están en juego. Captura predicciones y contesta trivias.',
  render({ name, prediccionesLink, triviasLink }) {
    const safeName = name && name.trim() ? escapeHtml(name.trim()) : 'participante';
    return wrapBranded(
      'Los partidos de J2 y J3 están en juego. Captura predicciones y contesta trivias.',
      [
        `<h1 style="margin:0 0 16px 0;color:#232124;font-size:26px;font-weight:900;line-height:1.2;">¡Hola ${safeName}!</h1>`,
        '<p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Ya están publicadas las <strong>TRIVIAS de J2 y J3</strong> del Mundial 2026 (<strong>2 puntos</strong> por respuesta correcta).</p>',
        '<p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Y recuerda: las predicciones de cada <strong>PARTIDO</strong> se sellan hasta su propio kickoff. Mientras un partido no haya comenzado, puedes capturar o modificar tu predicción.</p>',
        '<p style="margin:0 0 12px 0;color:#232124;font-size:15px;font-weight:700;">📍 Captura tus predicciones:</p>',
        emailButton(prediccionesLink, 'Ir a predicciones →'),
        '<p style="margin:28px 0 12px 0;color:#232124;font-size:15px;font-weight:700;">📍 Contesta las trivias:</p>',
        emailButton(triviasLink, 'Ir a trivias →'),
        '<div style="margin:32px 0 16px 0;padding:20px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;">',
        '<p style="margin:0 0 8px 0;color:#232124;font-size:14px;font-weight:700;">💯 Cada partido te puede dar:</p>',
        '<ul style="margin:0;padding-left:20px;color:#4a4a4a;font-size:13px;line-height:1.8;">',
        '<li><strong>5 pts</strong> si aciertas el marcador exacto</li>',
        '<li><strong>2 pts</strong> si aciertas solo el resultado</li>',
        '<li><strong>0 pts</strong> si no aciertas</li>',
        '</ul>',
        '<p style="margin:12px 0 0 0;color:#4a4a4a;font-size:13px;">🧠 Cada respuesta de trivia correcta: <strong>2 pts</strong>.</p>',
        '</div>',
        '<p style="margin:24px 0 0 0;color:#232124;font-size:15px;line-height:1.6;text-align:center;font-weight:600;">🏆 Sigue sumando. El que más sabe del Mundial y de balatas CanaBRAKE se lleva la motocicleta.</p>',
        '<p style="margin:16px 0 0 0;color:#E32125;font-size:16px;text-align:center;font-weight:700;">No te quedes fuera de lugar.</p>',
      ].join(''),
    );
  },
  renderWhatsApp({ name, magicLink }) {
    return waOpeningJ2J3Message(name, magicLink);
  },
};

const reminderSealJ3: NotificationTemplate = {
  key: 'reminder_seal_j3',
  label: 'Recordatorio: sella J3 (pronósticos y/o trivias)',
  subject: '⏰ Te faltan tus pronósticos y trivias de la Jornada 3',
  preheader: 'Aún no sellas la Jornada 3. Captura antes de que cierre la fase de grupos.',
  render({ name, prediccionesLink, triviasLink }) {
    const safeName = name && name.trim() ? escapeHtml(name.trim()) : 'participante';
    return wrapBranded(
      'Aún no sellas la Jornada 3. Captura antes de que cierre la fase de grupos.',
      [
        '<div style="text-align:center;padding-bottom:24px;"><div style="display:inline-block;background-color:#F59E0B;border-radius:50%;width:56px;height:56px;line-height:56px;text-align:center;"><span style="color:#FFFFFF;font-size:28px;">⏰</span></div></div>',
        `<h1 style="margin:0 0 16px 0;color:#232124;font-size:26px;font-weight:900;line-height:1.2;">¡Hola ${safeName}!</h1>`,
        '<p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Todavía nos faltan <strong>tus pronósticos de la Jornada 3</strong> y/o <strong>tus respuestas de las trivias</strong>. No dejes puntos sobre la mesa.</p>',
        '<p style="margin:0 0 12px 0;color:#232124;font-size:15px;font-weight:700;">📍 Sella tus pronósticos de J3:</p>',
        emailButton(prediccionesLink, 'Ir a predicciones →'),
        '<p style="margin:28px 0 12px 0;color:#232124;font-size:15px;font-weight:700;">📍 Contesta las trivias (2 pts c/u):</p>',
        emailButton(triviasLink, 'Ir a trivias →'),
        '<div style="margin:32px 0 16px 0;padding:20px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;">',
        '<p style="margin:0 0 8px 0;color:#232124;font-size:14px;font-weight:700;">📅 ¿Y qué sigue?</p>',
        '<p style="margin:0;color:#4a4a4a;font-size:13px;line-height:1.7;">En cuanto termine la <strong>fase de grupos</strong> se abrirá la siguiente fase (<strong>Dieciseisavos</strong>) para que envíes tus resultados pronosticados. Mantente al pendiente: te avisaremos en cuanto abra.</p>',
        '</div>',
        '<p style="margin:24px 0 0 0;color:#E32125;font-size:16px;text-align:center;font-weight:700;">No te quedes fuera de lugar.</p>',
      ].join(''),
    );
  },
  renderWhatsApp({ name, magicLink }) {
    return waReminderSealJ3Message(name, magicLink);
  },
};

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = {
  [triviasOpenJ2J3.key]: triviasOpenJ2J3,
  [reminderSealJ3.key]: reminderSealJ3,
};

export function getTemplate(key: string): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES[key] ?? null;
}
