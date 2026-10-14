'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/app/admin/(protected)/LogoutButton';

const NAV_LINKS = [
  { href: '/admin/registrations', label: 'Registros' },
  { href: '/admin/matches', label: 'Partidos' },
  { href: '/admin/phases', label: 'Fases' },
  { href: '/admin/trivias', label: 'Trivias' },
  { href: '/admin/notifications', label: 'Notificaciones' },
  { href: '/admin/ranking', label: 'Ranking' },
  { href: '/admin/links', label: 'Links' },
  // { href: '/admin/whatsapp', label: 'WhatsApp' },
  { href: '/admin/users', label: 'Usuarios' },
  { href: '/admin/change-password', label: 'Contraseña' },
  { href: '/dashboard', label: 'Dashboard' },
] as const;

export function AdminNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Close on route change
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, close]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, close]);

  function linkClasses(href: string) {
    const active = pathname === href || pathname.startsWith(href + '/');
    return active
      ? 'text-white font-semibold'
      : 'text-white/70 hover:text-white';
  }

  return (
    <>
      {/* ── Desktop nav (md+) ── */}
      <nav className="hidden md:flex items-center gap-3">
        {NAV_LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`text-xs transition-colors ${linkClasses(href)}`}
          >
            {label}
          </Link>
        ))}
        <LogoutButton />
      </nav>

      {/* ── Mobile hamburger (<md) ── */}
      <div className="md:hidden relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
        >
          {open ? (
            /* X icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            /* Hamburger icon */
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        {/* Backdrop + dropdown */}
        {open && (
          <>
            {/* Scrim */}
            <div className="fixed inset-0 z-40 bg-black/50" aria-hidden="true" />

            {/* Dropdown panel */}
            <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl py-2">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className={`block px-5 py-3 text-sm transition-colors ${linkClasses(href)} hover:bg-white/10`}
                >
                  {label}
                </Link>
              ))}
              <div className="border-t border-white/10 mt-1 pt-1 px-5 py-3">
                <LogoutButton />
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
