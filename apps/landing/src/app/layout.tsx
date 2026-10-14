import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Brake Station · Centro de Distribución CanaBRAKE en el Sureste de México · Balatas y Clutch',
  description:
    'Distribuidor especializado de refacciones de frenado y embrague para autos, camionetas y camión pesado. Cobertura en Yucatán, Tabasco, Chiapas, Campeche y Quintana Roo. Centro de Distribución oficial CanaBRAKE.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-white text-brand-navy antialiased">{children}</body>
    </html>
  );
}
