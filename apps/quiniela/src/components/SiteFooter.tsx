import Link from 'next/link';

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/10 bg-black/30 backdrop-blur-md">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <div className="text-white/60">
            © 2026 Brake Station · Centro de Distribución oficial CanaBRAKE
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/reglamento" className="text-white/80 hover:text-white transition-colors">
              Reglamento
            </Link>
            <Link href="/privacidad" className="text-white/80 hover:text-white transition-colors">
              Aviso de privacidad
            </Link>
            <a href="mailto:contacto@brakestation.com.mx" className="text-white/80 hover:text-white transition-colors">
              Contacto
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
