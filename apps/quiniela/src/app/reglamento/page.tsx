import { LegalPage, type LegalSection } from '@/components/LegalPage';

// TODO(legal): quitar robots noindex cuando Víctor apruebe el texto.
export const metadata = { title: 'Reglamento de la Quiniela', robots: { index: false, follow: false } };

// TODO(legal): BORRADOR. Víctor (comercial@brakestation.com.mx) lo revisa antes
// del lanzamiento público. Premios pendientes de definir por el Comité.
const SECTIONS: LegalSection[] = [
  {
    id: 'objetivo',
    title: 'De qué se trata',
    content:
      '<p>La Quiniela Copa Brake Station es un juego de pronósticos gratuito alrededor de la Copa Brake Station · Primera Edición 2026, el torneo de fútbol entre ocho equipos de clientes de Brake Station. Gana quien sume más puntos pronosticando los marcadores de los partidos.</p>',
  },
  {
    id: 'participantes',
    title: 'Quién puede participar',
    content:
      '<p>Cualquier persona de 18 años o más con un correo electrónico válido: jugadores, familiares, amigos y compañeros de trabajo. Cada persona participa con una sola cuenta y un solo correo.</p><p>Participar es gratis y no requiere compra.</p>',
  },
  {
    id: 'registro',
    title: 'Registro',
    content:
      '<p>Te registras en <strong>copa.brakestation.com.mx</strong> con tu correo, tu nombre y aceptando este reglamento y el aviso de privacidad. No hay contraseñas: cada vez que quieras entrar te mandamos un link a tu correo, válido por 24 horas.</p>',
  },
  {
    id: 'mecanica',
    title: 'Cómo se juega',
    content:
      '<p>Pronosticas el marcador de cada uno de los 32 partidos del torneo:</p><ul><li>Fase Regular: 28 partidos, jornadas 1 a 7, del 17 de octubre al 29 de noviembre de 2026.</li><li>Fase Final: 2 semifinales, partido por el 3er lugar y Gran Final, el 5 y 6 de diciembre de 2026.</li></ul><p>No es obligatorio pronosticar todos los partidos, pero un partido sin pronóstico vale 0 puntos.</p>',
  },
  {
    id: 'puntos',
    title: 'Puntos',
    content:
      '<ul><li><strong>10 puntos</strong> si aciertas el marcador exacto.</li><li><strong>3 puntos</strong> si aciertas el resultado (quién gana, o que hay empate) sin el marcador exacto.</li><li><strong>0 puntos</strong> si no aciertas el resultado.</li></ul><p>Se toma el marcador al final del tiempo reglamentario del partido, según lo registre la mesa de control del torneo.</p>',
  },
  {
    id: 'cierre',
    title: 'Cierre de pronósticos',
    content:
      '<p>Cada partido deja de aceptar pronósticos <strong>15 minutos antes</strong> de su hora de inicio (hora de Mérida). Hasta ese momento puedes cambiar tu pronóstico las veces que quieras; cuenta el último que guardaste.</p><p>Cada partido cierra por separado: que ya haya empezado un partido de la jornada no impide cambiar los que faltan.</p><p>Cada vez que guardas te llega un comprobante con un sello digital. Si el Comité cambia la hora de un partido, el cierre se mueve con él.</p>',
  },
  {
    id: 'fase-final',
    title: 'Fase Final',
    content:
      '<p>Al terminar la jornada 7, el Comité Organizador asigna las semifinales según la tabla del torneo (1° contra 4° y 2° contra 3°). El partido por el 3er lugar y la Gran Final se llenan solos con los resultados de las semifinales.</p><p>En la Fase Final no se aceptan pronósticos de empate: hay que elegir ganador. Si un partido termina empatado y se define en serie de penales, ganas <strong>3 puntos</strong> si elegiste al equipo que avanzó. En ese caso no aplica el marcador exacto.</p>',
  },
  {
    id: 'desempate',
    title: 'Desempate en el ranking',
    content:
      '<p>Si dos o más participantes tienen los mismos puntos, el orden se define así:</p><ol><li>Más marcadores exactos (aciertos de 10 puntos).</li><li>Más resultados acertados (aciertos de 3 puntos).</li><li>Quien guardó su último pronóstico más temprano.</li></ol>',
  },
  {
    id: 'ranking',
    title: 'Ranking público',
    content:
      '<p>El ranking se publica en el sitio y muestra solo tu nombre y la inicial de tu apellido (por ejemplo, "Luis M."). Nunca se publica tu correo.</p>',
  },
  {
    id: 'premios',
    title: 'Premios',
    content: '<p>A determinar por el Comité Organizador. Se comunicarán por correo a los participantes antes de que termine el torneo.</p>',
  },
  {
    id: 'comite',
    title: 'Comité Organizador',
    content:
      '<p>La quiniela la organizan Brake Station y GBS. El Comité resuelve cualquier situación que este reglamento no cubra, y puede descalificar cuentas duplicadas, con datos falsos o que intenten manipular el sistema.</p><p>Si el torneo cambia fechas, horarios o cancela un partido, el Comité ajusta la quiniela y lo avisa por correo.</p>',
  },
  {
    id: 'comunicacion',
    title: 'Comunicación oficial',
    content:
      '<p>Toda comunicación oficial llega por correo desde <strong>no-reply@brakestation.com.mx</strong>. Para dudas escribe a <a href="mailto:comercial@brakestation.com.mx" class="underline text-brand-gold">comercial@brakestation.com.mx</a>.</p><p>Participar implica aceptar este reglamento.</p>',
  },
];

export default function ReglamentoPage() {
  return <LegalPage title="Reglamento de la Quiniela" subtitle="Borrador para revisión del Comité Organizador" sections={SECTIONS} updated="14 de octubre de 2026" />;
}
