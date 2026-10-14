import Link from 'next/link';
import { BrandHeader } from './BrandHeader';
import { SiteFooter } from './SiteFooter';
import { AccordionOpener } from './AccordionOpener';

export type LegalSection = { id: string; title: string; content: string }; // content = HTML estático del repo

export function LegalPage({ title, subtitle, sections, updated }: { title: string; subtitle: string; sections: LegalSection[]; updated: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-black/30 border-b border-white/10 px-4 py-3 flex items-center justify-between gap-4">
        <BrandHeader />
        <Link href="/" className="text-sm text-white/80 hover:text-white">Inicio</Link>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <p className="text-brand-gold text-xs font-bold tracking-widest uppercase mb-2">Copa Brake Station · Primera Edición 2026</p>
          <h1 className="text-4xl sm:text-5xl font-black text-white mb-2">{title}</h1>
          <p className="text-white/70">{subtitle}</p>
        </div>

        <nav className="bg-white/[0.06] border border-white/[0.12] rounded-2xl p-5 mb-6">
          <h2 className="text-white/80 font-bold uppercase text-xs tracking-widest mb-3">Contenido</h2>
          <ol className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm list-decimal pl-5">
            {sections.map((s) => (
              <li key={s.id}><a href={`#${s.id}`} className="text-white/85 hover:text-brand-gold">{s.title}</a></li>
            ))}
          </ol>
        </nav>

        <AccordionOpener />

        <div className="space-y-3">
          {sections.map((s, i) => (
            <details key={s.id} id={s.id} className="group bg-white/[0.06] border border-white/[0.12] rounded-2xl overflow-hidden open:bg-white/[0.10]">
              <summary className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4 cursor-pointer text-white font-bold text-base sm:text-lg list-none [&::-webkit-details-marker]:hidden">
                <span><span className="text-brand-gold font-mono text-sm mr-3">{String(i + 1).padStart(2, '0')}.</span>{s.title}</span>
                <svg className="w-5 h-5 text-white/60 transition-transform group-open:rotate-180 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              </summary>
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 text-white/85 leading-relaxed text-sm sm:text-base [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mt-1 [&_p+p]:mt-3" dangerouslySetInnerHTML={{ __html: s.content }} />
            </details>
          ))}
        </div>

        <p className="mt-12 pt-6 border-t border-white/10 text-center text-white/60 text-sm">Última actualización: {updated}</p>
      </main>
      <SiteFooter />
    </div>
  );
}
