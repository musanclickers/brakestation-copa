// Logo Copa Brake Station · Primera Edición 2026 (servido desde public/ de la app).
// TODO(2027 refactor): el logo cambia por edición; leerlo de la tabla editions.
export function Logo({ className = 'h-12 w-auto', alt = 'Copa Brake Station · Primera Edición 2026' }: { className?: string; alt?: string }) {
  return <img src="/images/logo-copa.png" alt={alt} className={className} loading="eager" decoding="async" />;
}
