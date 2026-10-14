'use client';

import { useEffect } from 'react';

export function AccordionOpener() {
  useEffect(() => {
    if (location.hash) {
      const el = document.querySelector(location.hash);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, []);

  return null;
}
