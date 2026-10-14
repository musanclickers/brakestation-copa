import { wrapBranded, emailButton, escapeHtml } from '@brakestation/auth/email';
import { LOCKOUT_MINUTES } from '@brakestation/db/phases';
import { POINTS } from './score-match';

export type TemplateRecipientContext = { name: string; quinielaLink: string };

export type NotificationTemplate = {
  key: string;
  label: string;
  subject: string;
  preheader: string;
  render(ctx: TemplateRecipientContext): string;
};

const hola = (name: string) => {
  const first = name.trim().split(/\s+/)[0];
  return `<h1 style="margin:0 0 16px 0;color:#0a1e3d;font-size:26px;font-weight:900;line-height:1.2;">Hola ${first ? escapeHtml(first) : ''}</h1>`;
};
const p = (html: string) => `<p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">${html}</p>`;

const scoringBox = [
  '<div style="margin:28px 0 0 0;padding:16px 20px;background-color:#F4F4F4;border-left:3px solid #3A63A8;border-radius:4px;">',
  '<p style="margin:0 0 6px 0;color:#232124;font-size:14px;font-weight:700;">Cómo se gana</p>',
  `<p style="margin:0;color:#4a4a4a;font-size:13px;line-height:1.7;">${POINTS.exact} puntos por marcador exacto. ${POINTS.result} por acertar quién gana o el empate. Cada partido cierra ${LOCKOUT_MINUTES} minutos antes de empezar.</p>`,
  '</div>',
].join('');

const recordatorio: NotificationTemplate = {
  key: 'recordatorio_pronosticos',
  label: 'Recordatorio: faltan pronósticos de partidos abiertos',
  subject: 'Te faltan pronósticos en la Copa Brake Station',
  preheader: 'Todavía hay partidos abiertos sin tu pronóstico.',
  render({ name, quinielaLink }) {
    return wrapBranded(this.preheader, [
      hola(name),
      p('Todavía hay partidos de la Copa Brake Station sin tu pronóstico. Te toma un minuto llenarlos desde el celular.'),
      p(`Ojo: cada partido cierra ${LOCKOUT_MINUTES} minutos antes de que empiece y ya no se puede cambiar.`),
      emailButton(quinielaLink, 'Pronosticar ahora →'),
      scoringBox,
    ].join(''));
  },
};

const faseFinal: NotificationTemplate = {
  key: 'fase_final_abierta',
  label: 'Ya están las semifinales (Fase Final abierta)',
  subject: 'Ya hay semifinalistas: pronostica la Fase Final',
  preheader: 'Terminó la fase regular. Ya puedes pronosticar las semifinales.',
  render({ name, quinielaLink }) {
    return wrapBranded(this.preheader, [
      hola(name),
      p('Terminó la fase regular y ya están definidas las semifinales de la Copa Brake Station.'),
      p('En la Fase Final no hay empates: elige quién gana. Si el partido se define en penales, tu pronóstico cuenta igual si le atinaste al que avanzó.'),
      emailButton(quinielaLink, 'Pronosticar semifinales →'),
      p('<span style="font-size:13px;color:#888;">El 3er lugar y la Gran Final se abren en cuanto terminen las semis.</span>'),
    ].join(''));
  },
};

const jornadaNueva: NotificationTemplate = {
  key: 'nueva_jornada',
  label: 'Aviso general: arranca la jornada del fin de semana',
  subject: 'Este fin de semana hay jornada de la Copa Brake Station',
  preheader: 'Revisa los partidos del fin de semana y deja tus pronósticos.',
  render({ name, quinielaLink }) {
    return wrapBranded(this.preheader, [
      hola(name),
      p('Este fin de semana se juega otra jornada de la Copa Brake Station. Entra, revisa los partidos y deja tus pronósticos antes de que cierren.'),
      emailButton(quinielaLink, 'Ver partidos →'),
      scoringBox,
    ].join(''));
  },
};

export const NOTIFICATION_TEMPLATES: Record<string, NotificationTemplate> = Object.fromEntries(
  [recordatorio, jornadaNueva, faseFinal].map((t) => [t.key, t]),
);

export function getTemplate(key: string): NotificationTemplate | null {
  return NOTIFICATION_TEMPLATES[key] ?? null;
}
