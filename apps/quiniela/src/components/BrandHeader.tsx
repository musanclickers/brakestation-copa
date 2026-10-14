import Link from 'next/link';
import { Logo } from '@brakestation/ui';

const SIZES = { sm: 'h-9', md: 'h-11', lg: 'h-28 sm:h-36' };

export function BrandHeader({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2" aria-label="Copa Brake Station, inicio">
      <Logo className={`${SIZES[size]} w-auto drop-shadow-lg`} />
      {size !== 'lg' && <span className="hidden sm:inline font-display text-xl tracking-wide text-white">Copa Brake Station</span>}
    </Link>
  );
}
