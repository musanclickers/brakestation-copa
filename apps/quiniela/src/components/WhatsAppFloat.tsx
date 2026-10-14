'use client';

import { usePathname } from 'next/navigation';

const WA_NUMBER = '5219993958420';
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola, necesito ayuda con la Dinámica Goleadora CanaBRAKE')}`;

export function WhatsAppFloat() {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Soporte por WhatsApp"
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/25 transition-transform hover:scale-110 active:scale-95"
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 fill-current">
        <path d="M16.004 0h-.008C7.174 0 0 7.176 0 16.004c0 3.5 1.129 6.744 3.047 9.379L1.054 31.25l6.1-1.953A15.9 15.9 0 0 0 16.004 32C24.826 32 32 24.824 32 15.996S24.826 0 16.004 0Zm9.32 22.598c-.39 1.098-1.917 2.01-3.156 2.276-.848.18-1.957.324-5.687-1.222-4.774-1.98-7.84-6.828-8.078-7.145-.23-.316-1.918-2.554-1.918-4.871s1.215-3.456 1.645-3.928c.43-.473.94-.59 1.254-.59.312 0 .625.003.898.016.289.014.676-.11 1.058.808.39.94 1.332 3.238 1.449 3.473.117.234.195.508.039.82-.156.316-.234.512-.469.79-.234.273-.492.61-.703.82-.234.234-.48.488-.207.957s1.215 2.008 2.61 3.254c1.793 1.602 3.305 2.098 3.773 2.332.47.234.743.195 1.016-.117.273-.316 1.176-1.371 1.488-1.844.313-.472.625-.39 1.055-.234.43.156 2.727 1.289 3.195 1.523.469.234.781.352.898.547.117.195.117 1.133-.273 2.23Z" />
      </svg>
    </a>
  );
}
