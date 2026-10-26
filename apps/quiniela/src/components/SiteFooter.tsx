import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/30 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="text-white/60 text-center sm:text-left">© 2026 Copa Brake Station</div>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <Link href="/tabla" className="text-white/80 hover:text-white">Tabla de posiciones</Link>
            <Link href="/reglamento" className="text-white/80 hover:text-white">Reglamento</Link>
            <Link href="/privacidad" className="text-white/80 hover:text-white">Aviso de privacidad</Link>
            <a href="mailto:comercial@brakestation.com.mx" className="text-white/80 hover:text-white">Contacto</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
