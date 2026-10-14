import type { Metadata } from 'next';
import './globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://copa.brakestation.com.mx';
const TITLE = 'Quiniela Copa Brake Station · Primera Edición 2026';
const DESCRIPTION = 'Pronostica los 32 partidos de la Copa Brake Station y compite con amigos, familia y compañeros. Marcador exacto vale 10 puntos.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s · Copa Brake Station' },
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: 'Copa Brake Station',
    locale: 'es_MX',
    type: 'website',
    images: [{ url: '/images/og-copa.jpg', width: 1200, height: 630, alt: 'Copa Brake Station · Primera Edición 2026' }],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION, images: ['/images/og-copa.jpg'] },
  icons: { icon: '/favicon.ico', apple: '/apple-icon.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans bg-brand-deep text-white antialiased">{children}</body>
    </html>
  );
}
