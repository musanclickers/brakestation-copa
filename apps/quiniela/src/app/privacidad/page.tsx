import { LegalPage, type LegalSection } from '@/components/LegalPage';

export const metadata = { title: 'Aviso de privacidad' };

// TODO(legal): BORRADOR. Víctor (comercial@brakestation.com.mx) lo revisa antes
// del lanzamiento público. Falta confirmar razón social y domicilio del responsable.
const SECTIONS: LegalSection[] = [
  {
    id: 'responsable',
    title: 'Responsable',
    content:
      '<p>Brake Station, como parte del Comité Organizador de la Copa Brake Station, es responsable de los datos personales que recabamos en esta quiniela.</p>',
  },
  {
    id: 'datos',
    title: 'Qué datos recabamos',
    content:
      '<ul><li>Tu correo electrónico.</li><li>Tu nombre.</li><li>La dirección IP desde la que te registraste.</li><li>Tus pronósticos y la fecha y hora en que los guardaste.</li></ul><p>No pedimos teléfono, domicilio ni datos financieros.</p>',
  },
  {
    id: 'uso',
    title: 'Para qué los usamos',
    content:
      '<p>Solo para operar la quiniela: darte acceso, guardar tus pronósticos, calcular el ranking, mandarte comprobantes y avisos del torneo, y contactarte si ganas un premio. La IP sirve para prevenir abuso y cuentas duplicadas.</p>',
  },
  {
    id: 'terceros',
    title: 'Con quién los compartimos',
    content:
      '<p>No vendemos ni compartimos tus datos con terceros para fines comerciales. Los correos se envían a través de un proveedor de envío de email que solo los usa para entregarlos.</p><p>En el ranking público solo aparece tu nombre con la inicial del apellido.</p>',
  },
  {
    id: 'retencion',
    title: 'Cuánto tiempo los guardamos',
    content: '<p>Hasta el cierre del torneo y 60 días más. Después los eliminamos.</p>',
  },
  {
    id: 'derechos',
    title: 'Tus derechos',
    content:
      '<p>Puedes pedir acceso, rectificación o cancelación de tus datos, u oponerte a su uso, escribiendo a <a href="mailto:comercial@brakestation.com.mx" class="underline text-brand-gold">comercial@brakestation.com.mx</a> desde el correo con el que te registraste. Si cancelas tus datos antes de que termine el torneo, sales de la quiniela.</p>',
  },
  {
    id: 'cambios',
    title: 'Cambios a este aviso',
    content: '<p>Si cambiamos este aviso, publicamos la versión nueva en esta página y te avisamos por correo.</p>',
  },
];

export default function PrivacidadPage() {
  return <LegalPage title="Aviso de privacidad" subtitle="Borrador para revisión del Comité Organizador" sections={SECTIONS} updated="14 de octubre de 2026" />;
}
