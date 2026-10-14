import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdminBackground } from '@/components/AdminBackground';
import { AccordionOpener } from './AccordionOpener';

const SECTIONS = [
  { id: 'responsable', num: '01', title: 'Responsable del tratamiento', content: '<p><strong>Grupo Brakes Station América S.R.L. de C.V.</strong> (en adelante "Brake Station"), con domicilio comercial en Mérida, Yucatán, es el responsable del uso y protección de tus datos personales en términos de la LFPDPPP.</p>' },
  { id: 'datos', num: '02', title: 'Datos personales que recabamos', content: '<ul class="list-disc pl-6 space-y-1"><li><strong>Identificación:</strong> nombre completo y correo electrónico.</li><li><strong>Contacto:</strong> número de teléfono (WhatsApp).</li><li><strong>Imagen:</strong> fotografía con playera CanaBRAKE y folio visible.</li><li><strong>Afiliación comercial:</strong> negocio donde obtuviste la playera.</li><li><strong>Participación:</strong> predicciones, trivias, registro de boleto.</li></ul><p class="mt-3">No recabamos datos sensibles.</p>' },
  { id: 'finalidades', num: '03', title: 'Finalidades del tratamiento', content: '<p class="mb-2"><strong>Primarias:</strong> Validar participación, contactar para entrega de premios, generar sellos digitales (HMAC-SHA256), mostrar ranking público, comunicar cambios vía email.</p><p><strong>Secundarias</strong> (puedes oponerte): Promoción futura, análisis estadístico, uso de imagen publicitario.</p>' },
  { id: 'transferencias', num: '04', title: 'Transferencias de datos', content: '<p>Tus datos <strong>NO serán compartidos con terceros</strong> distintos a CanaBRAKE México para fines exclusivos de validación de premios. No comercializamos tu información.</p>' },
  { id: 'arco', num: '05', title: 'Derechos ARCO', content: '<p>Tienes derecho a Acceso, Rectificación, Cancelación y Oposición sobre tus datos personales.</p>' },
  { id: 'ejercer-arco', num: '06', title: 'Cómo ejercer tus derechos ARCO', content: '<p>Envía solicitud a <a href="mailto:contacto@brakestation.com.mx" class="text-brand-red underline">contacto@brakestation.com.mx</a> con asunto "Solicitud ARCO — Dinámica Goleadora". Incluir: nombre, correo de registro, derecho a ejercer y motivación. Respuesta en máximo <strong>20 días hábiles</strong>.</p>' },
  { id: 'conservacion', num: '07', title: 'Conservación de los datos', content: '<p>Datos conservados durante la vigencia de la dinámica + <strong>12 meses adicionales</strong>. Posteriormente serán eliminados o anonimizados.</p>' },
  { id: 'seguridad', num: '08', title: 'Medidas de seguridad', content: '<p>Predicciones selladas con HMAC-SHA256. Infraestructura protegida con HTTPS, autenticación de admins, control de acceso por roles.</p>' },
  { id: 'cookies', num: '09', title: 'Cookies', content: '<p>Cookies estrictamente necesarias para autenticación. Sin cookies de seguimiento publicitario de terceros.</p>' },
  { id: 'modificaciones', num: '10', title: 'Modificaciones al aviso', content: '<p>Brake Station se reserva el derecho de modificar este aviso. Las modificaciones se publicarán en esta página con fecha de actualización.</p>' },
  { id: 'aceptacion', num: '11', title: 'Aceptación', content: '<p>Al registrarte y aceptar el Reglamento Oficial, manifiestas haber leído y aceptado el presente Aviso de Privacidad.</p>' },
];

export default function PrivacidadPage() {
  return (
    <AdminBackground>
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/dashboard" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          <span className="text-sm font-medium">Volver</span>
        </Link>
        <BrandHeader variant="horizontal" size="md" />
        <div className="w-20" />
      </header>

      <main className="max-w-3xl mx-auto px-4 py-12">
        <div className="text-center mb-10">
          <p className="text-brand-red text-xs font-bold tracking-widest uppercase mb-2">Documento legal</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">Aviso de Privacidad</h1>
          <p className="text-white/80 text-lg">Dinámica Goleadora CanaBRAKE × Brake Station</p>
        </div>

        <nav className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-5 mb-8">
          <h2 className="text-white/80 font-bold uppercase text-xs tracking-widest mb-3">Contenido</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {SECTIONS.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-white/85 hover:text-brand-red transition-colors">{s.num}. {s.title}</a></li>
            ))}
          </ol>
        </nav>

        <AccordionOpener />

        <div className="space-y-3">
          {SECTIONS.map((s) => (
            <details key={s.id} id={s.id} className="group backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden transition-all open:bg-white/[0.10] open:border-white/[0.20]">
              <summary className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 cursor-pointer text-white font-bold text-base sm:text-lg list-none hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-red/40 [&::-webkit-details-marker]:hidden">
                <span><span className="text-brand-red font-mono text-sm mr-3">{s.num}.</span>{s.title}</span>
                <svg className="w-5 h-5 text-white/60 transition-transform duration-200 group-open:rotate-180 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-white/85 leading-relaxed text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: s.content }} />
            </details>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-white/10 text-center">
          <p className="text-white/60 text-sm">Última actualización: 1 de junio de 2026</p>
          <p className="text-white/40 text-xs mt-2">Grupo Brakes Station América S.R.L. de C.V. · Mérida, Yucatán</p>
        </div>
      </main>
      <SiteFooter />
    </AdminBackground>
  );
}
