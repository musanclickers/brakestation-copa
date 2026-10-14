'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export type Client = {
  id: string;
  name: string;
  type: string;
  city: string;
  branch: string;
};

export type ClientSelectorProps = {
  value: { client_id?: string; client_text?: string } | null;
  onChange: (v: { client_id?: string; client_text?: string } | null) => void;
  branch?: 'merida' | 'villahermosa' | 'tuxtla';
};

export function ClientSelector({ value, onChange, branch }: ClientSelectorProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [inputText, setInputText] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [fetchFailed, setFetchFailed] = useState(false);

  useEffect(() => {
    const url = branch ? `/api/clients?branch=${branch}` : '/api/clients';
    fetch(url)
      .then((r) => r.json())
      .then((data: unknown) => {
        const list = Array.isArray(data) ? data
          : Array.isArray((data as Record<string, unknown>)?.clients) ? (data as Record<string, unknown>).clients as Client[]
          : [];
        setClients(list);
        if (list.length === 0) setFetchFailed(true);
      })
      .catch((err) => {
        console.error('[ClientSelector]', err);
        setClients([]);
        setFetchFailed(true);
      });
  }, [branch]);

  // Sync input text when value changes externally
  useEffect(() => {
    if (value?.client_id) {
      const c = clients.find((cl) => cl.id === value.client_id);
      if (c) setInputText(c.name);
    } else if (value?.client_text) {
      setInputText(value.client_text);
    } else {
      setInputText('');
    }
  }, [value, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = clients
    .filter(
      (c) =>
        c.name.toLowerCase().includes(inputText.toLowerCase()) ||
        c.city.toLowerCase().includes(inputText.toLowerCase()),
    )
    .slice(0, 10);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const text = e.target.value;
      setInputText(text);
      setOpen(true);

      if (!text.trim()) {
        onChange(null);
        return;
      }

      // Check if the typed text exactly matches a client
      const exact = clients.find(
        (c) => c.name.toLowerCase() === text.toLowerCase(),
      );
      if (exact) {
        onChange({ client_id: exact.id });
      } else {
        onChange({ client_text: text });
      }
    },
    [clients, onChange],
  );

  const handleSelect = useCallback(
    (client: Client) => {
      setInputText(client.name);
      setOpen(false);
      onChange({ client_id: client.id });
    },
    [onChange],
  );

  const noMatch = inputText.trim().length > 0 && filtered.length === 0;

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        value={inputText}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cliente..."
        className="w-full rounded-lg border border-brand-navy/20 bg-white px-4 py-2 text-sm text-brand-navy placeholder:text-brand-navy/40 focus:outline-none focus:ring-2 focus:ring-brand-navy/30"
      />

      {open && filtered.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-brand-navy/20 bg-white shadow-lg">
          {filtered.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                className="flex w-full flex-col px-4 py-2 text-left hover:bg-brand-gray"
                onClick={() => handleSelect(client)}
              >
                <span className="text-sm font-medium text-brand-navy">
                  {client.name}
                </span>
                <span className="text-xs text-brand-navy/60">
                  {client.type} &middot; {client.city}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {fetchFailed && clients.length === 0 && (
        <p className="mt-1 text-xs text-brand-navy/60">
          No hay clientes en el catálogo. Escribe el nombre directamente.
        </p>
      )}

      {noMatch && (
        <p className="mt-1 text-xs text-brand-navy/60">
          Se usara: <span className="font-medium">{inputText}</span>
        </p>
      )}
    </div>
  );
}
