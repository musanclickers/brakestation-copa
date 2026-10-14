export default function VerificarPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="font-display text-5xl text-brand-red mb-2">Dinámica Goleadora</h1>
      <p className="font-sans text-lg text-brand-blue font-semibold mb-8">
        CanaBRAKE × Brake Station
      </p>

      <div className="w-full max-w-sm text-center">
        <div className="rounded-brand bg-brand-gray p-8 mb-6">
          <p className="text-2xl mb-2">📬</p>
          <h2 className="text-xl font-semibold text-brand-navy mb-2">Revisa tu email</h2>
          <p className="text-brand-navy/70">
            Te enviamos un enlace de acceso. Haz clic en él para activar tu boleto.
          </p>
        </div>
        <p className="text-sm text-brand-navy/50">
          Si no lo ves, revisa tu carpeta de spam. El enlace expira en 24 horas.
        </p>
      </div>
    </main>
  );
}
