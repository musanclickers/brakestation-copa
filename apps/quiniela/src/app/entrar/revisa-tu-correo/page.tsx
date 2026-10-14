import Link from 'next/link';
import { BrandHeader } from '@/components/BrandHeader';

export default function RevisaTuCorreoPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-[#0a1e3d] via-[#14306a] to-[#0a1e3d]">
      <BrandHeader size="lg" />
      <div className="mt-6 w-full max-w-sm text-center backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-8">
        <p className="text-4xl mb-3" aria-hidden>📬</p>
        <h2 className="text-xl font-bold text-white mb-2">Revisa tu correo</h2>
        <p className="text-white/75 text-sm">
          Te mandamos un link para entrar. Ábrelo desde este mismo teléfono o computadora.
        </p>
        <p className="mt-4 text-xs text-white/50">
          ¿No llegó? Busca en spam o promociones. El link sirve 24 horas.
        </p>
        <Link href="/entrar" className="mt-6 inline-block text-sm font-semibold text-brand-gold underline">
          Pedir otro link
        </Link>
      </div>
    </main>
  );
}
