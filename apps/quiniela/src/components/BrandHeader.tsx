import { Logo } from '@brakestation/ui';

type BrandHeaderProps = {
  variant?: 'stacked' | 'horizontal';
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = { sm: 'h-8', md: 'h-10', lg: 'h-14' };
const CANA_SIZES = { sm: 'h-[42px]', md: 'h-[63px]', lg: 'h-[78px]' };

export function BrandHeader({ variant = 'stacked', size = 'md' }: BrandHeaderProps) {
  if (variant === 'horizontal') {
    return (
      <div className="inline-flex items-center gap-2 sm:gap-4 bg-white rounded-xl px-3 py-2 sm:px-5 sm:py-3 shadow-md">
        <Logo variant="brakestation" className={`${SIZES[size]} w-auto`} />
        <span className="text-gray-300 text-lg sm:text-2xl font-light select-none">×</span>
        <Logo variant="canabrake" className={`${CANA_SIZES[size]} w-auto`} />
      </div>
    );
  }

  return (
    <div className="inline-flex flex-col items-center gap-1 bg-white rounded-xl px-4 py-2.5 shadow-md">
      <Logo variant="brakestation" className={`${SIZES[size]} w-auto`} />
      <div className="w-12 h-px bg-gray-200" />
      <Logo variant="canabrake" className={`${CANA_SIZES[size]} w-auto`} />
    </div>
  );
}
