import type { Metadata } from 'next';
import { WhatsAppFloat } from '@/components/WhatsAppFloat';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dinámica Goleadora CanaBRAKE | Brake Station',
  description: 'Predice los 104 partidos del Mundial 2026 y gana premios con tu habilidad y conocimiento. Centro de Distribución oficial CanaBRAKE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-white text-brand-navy antialiased">
        {children}
        <WhatsAppFloat />
      </body>
    </html>
  );
}
