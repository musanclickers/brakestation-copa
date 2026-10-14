import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { AdminBackground } from '@/components/AdminBackground';
import { AccordionOpener } from './AccordionOpener';

const SECTIONS = [
  { id: 'organizador', num: '01', title: 'Organizador', content: '<p>La presente dinámica promocional es organizada por <strong>Brake Station</strong>, Centro de Distribución Sureste CanaBRAKE México.</p>' },
  { id: 'vigencia', num: '02', title: 'Vigencia', content: '<p>La fecha límite de registro a la dinámica será el día 11 de junio de 2026 a las 12:59 hrs horario Ciudad de México.</p><p class="mt-3">La presente dinámica tendrá vigencia del 11 de junio de 2026 al 19 de julio de 2026, periodo correspondiente a la celebración de la Copa Mundial de la FIFA 2026.</p>' },
  { id: 'participantes', num: '03', title: 'Participantes', content: '<p class="mb-3">Podrán participar exclusivamente:</p><ul class="list-disc pl-6 space-y-2"><li>Clientes que realicen compra de balatas CanaBRAKE antes del <strong>9 de junio de 2026</strong>.</li><li>Fuerza de ventas y empleados de clientes activos de Brake Station.</li><li>Clientes autorizados por la Gerencia General por compra especial.</li></ul><p class="mt-3">La participación implica la aceptación total del presente reglamento.</p>' },
  { id: 'mecanica', num: '04', title: 'Mecánica general', content: '<p>Los participantes podrán integrarse mediante la obtención de una playera edición especial Mundialista entregada por compras acumuladas de balatas CanaBRAKE. Cada playera incluirá un folio único de participación y acceso vía <a href="https://goleadora.brakestation.com.mx" class="text-brand-red underline">goleadora.brakestation.com.mx</a>.</p>' },
  { id: 'registro', num: '05', title: 'Registro', content: '<p class="mb-3">Para validar su participación:</p><ol class="list-decimal pl-6 space-y-2"><li>Escanear el código QR o entrar a <a href="https://goleadora.brakestation.com.mx" class="text-brand-red underline">goleadora.brakestation.com.mx</a>.</li><li>Completar el formulario de registro (nombre, teléfono, cliente).</li><li>Ingresar el folio asignado.</li><li>Subir fotografía con la playera CanaBRAKE y el boleto visible.</li><li><em>Opcional:</em> postea tu foto, etiqueta a Brake Station y CanaBRAKE, sigue los perfiles y obtén 10 puntos.</li></ol>' },
  { id: 'puntos', num: '06', title: 'Sistema de puntos', content: '<p class="mb-3">Puntos por partido:</p><p><strong class="text-emerald-300">5 pts</strong> — Marcador exacto · <strong class="text-blue-300">2 pts</strong> — Resultado correcto · <strong class="text-white/50">0 pts</strong> — Incorrecto</p><p class="mt-3">Trivias bonus: 10 trivias opcionales, <strong class="text-yellow-300">2 pts</strong> cada una = 20 pts máximos.</p><h3 class="text-lg font-bold text-white mt-6 mb-3">Bonus social (opcional)</h3><p>Postea tu foto usando la playera Mundialista CanaBRAKE en Facebook o Instagram, etiqueta a <strong>@BrakeStation</strong> y <strong>@CanaBRAKE</strong>, y sigue ambos perfiles. Suma <strong class="text-yellow-300">10 puntos extra</strong> (one-time, verificado manualmente). Para reclamarlos, envía la captura de pantalla al <a href="https://wa.me/5219993958420" target="_blank" rel="noopener" class="text-brand-red underline font-semibold">WhatsApp de soporte</a>.</p><p class="mt-3">Puntaje máximo total: <strong class="text-brand-red">550 puntos</strong> (520 partidos + 20 trivias + 10 bonus social).</p>' },
  { id: 'tabla-posiciones', num: '07', title: 'Tabla de posiciones', content: '<p>El organizador podrá publicar rankings parciales o generales. <strong>No se revelarán datos sensibles.</strong> El ranking se mostrará por número de boleto y nombre de pila + inicial.</p>' },
  { id: 'ganador', num: '08', title: 'Ganador', content: '<p>Será considerado ganador el participante que obtenga la mayor cantidad total de puntos acumulados al finalizar la dinámica el 19 de julio de 2026.</p>' },
  { id: 'desempates', num: '09', title: 'Desempates', content: '<p class="mb-3">En caso de empate:</p><ol class="list-[lower-alpha] pl-6 space-y-2"><li>Mayor cantidad de marcadores exactos.</li><li>Mayor cantidad de respuestas correctas en trivias.</li><li>Fecha y hora más temprana de registro oficial.</li></ol>' },
  { id: 'premios', num: '10', title: 'Premios', content: '<p class="mb-3">Podrán incluir:</p><ul class="list-disc pl-6 space-y-2"><li>Premio de alto valor: <strong>motocicleta</strong></li><li>Más premios según número de participantes.</li></ul><p class="mt-3 text-white/70 italic">No transferibles ni canjeables por efectivo.</p>' },
  { id: 'validacion', num: '11', title: 'Validación', content: '<p class="mb-3">El organizador se reserva el derecho de verificar:</p><ul class="list-disc pl-6 space-y-1"><li>Identidad del participante</li><li>Compras realizadas</li><li>Folios entregados</li><li>Fotografías subidas</li><li>Legitimidad y cumplimiento del reglamento</li></ul>' },
  { id: 'descalificacion', num: '12', title: 'Descalificación', content: '<p class="mb-3">Motivos de descalificación:</p><ul class="list-disc pl-6 space-y-1"><li>Datos falsos</li><li>Duplicidad de registros</li><li>Alteración de folios</li><li>Conductas fraudulentas</li><li>Contenido ofensivo</li><li>Manipulación del sistema</li></ul>' },
  { id: 'imagen', num: '13', title: 'Uso de imagen', content: '<p>Los participantes autorizan a <strong>Grupo Brakes Station América S.R.L. de C.V.</strong> a utilizar fotografías, imágenes y material generado para fines promocionales sin compensación adicional.</p>' },
  { id: 'modificaciones', num: '14', title: 'Modificaciones', content: '<p>El organizador podrá realizar ajustes o cancelaciones por causas operativas, comerciales o de fuerza mayor, notificándolo mediante sus medios oficiales.</p>' },
  { id: 'responsabilidad', num: '15', title: 'Responsabilidad', content: '<p>La participación implica el conocimiento y aceptación total del presente reglamento.</p>' },
  { id: 'contacto', num: '16', title: 'Contacto', content: '<p>Para dudas o aclaraciones, comunicarse mediante los canales oficiales de Brake Station.</p>' },
];

export default function ReglamentoPage() {
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
          <p className="text-brand-red text-xs font-bold tracking-widest uppercase mb-2">Documento oficial</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">Reglamento</h1>
          <p className="text-white/80 text-lg">"Vive el Mundial con CanaBRAKE" · Dinámica Goleadora</p>
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
        </div>
      </main>
      <SiteFooter />
    </AdminBackground>
  );
}
