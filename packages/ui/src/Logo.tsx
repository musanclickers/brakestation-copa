type LogoProps = {
  variant?: 'brakestation' | 'canabrake';
  className?: string;
  alt?: string;
  onDark?: boolean;
};

const URLS = {
  brakestation: 'https://assets.brakestation.com.mx/images/logo_gbs.png',
  canabrake: 'https://assets.brakestation.com.mx/images/logo_cana.png',
} as const;

const ALTS = {
  brakestation: 'Brake Station',
  canabrake: 'CanaBRAKE PosiTech BALATAS',
} as const;

export function Logo({ variant = 'brakestation', className = 'h-10 w-auto', alt, onDark = false }: LogoProps) {
  const img = (
    <img
      src={URLS[variant]}
      alt={alt ?? ALTS[variant]}
      className={className}
      loading="eager"
      decoding="async"
      style={{ filter: 'none', mixBlendMode: 'normal' }}
    />
  );

  if (onDark) {
    return (
      <span className="inline-flex items-center justify-center bg-white rounded-xl px-3 py-1.5 shadow-md">
        {img}
      </span>
    );
  }

  return img;
}
