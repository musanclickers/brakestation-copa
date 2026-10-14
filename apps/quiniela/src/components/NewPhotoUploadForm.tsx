'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';

export function NewPhotoUploadForm({ registrationId }: { registrationId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError('La foto no debe exceder 8 MB.'); return; }
    if (!['image/jpeg', 'image/png'].includes(file.type)) { setError('Solo JPEG o PNG.'); return; }
    setError(null);
    setPreview(URL.createObjectURL(file));
  }

  async function handleSubmit() {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('photo', file);

    try {
      const res = await fetch(`/api/registration/${registrationId}/update-photo`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        router.push('/activar');
        router.refresh();
      } else {
        const body = await res.json();
        setError(body.message ?? 'Error al subir foto');
      }
    } catch {
      setError('Error de red');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <details className="rounded-xl border border-white/15 bg-white/[0.05]">
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-white/80 hover:text-white transition-colors list-none [&::-webkit-details-marker]:hidden">
          <svg className="w-4 h-4 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Ver ejemplo de foto correcta
        </summary>
        <div className="px-4 pb-4">
          <img
            src="/images/ejemplo-foto.jpg"
            alt="Ejemplo: persona con playera CanaBRAKE sosteniendo el boleto con el código visible"
            className="w-full max-w-[280px] mx-auto rounded-xl border border-white/20 shadow-lg"
            loading="lazy"
          />
          <ul className="mt-3 space-y-1 text-xs text-white/60">
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">&#10003;</span> Playera CanaBRAKE visible</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">&#10003;</span> Boleto con código legible</li>
            <li className="flex items-start gap-1.5"><span className="text-emerald-400 mt-0.5">&#10003;</span> Foto clara, bien iluminada</li>
          </ul>
        </div>
      </details>
      <div
        onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-white/30 hover:border-white/50 rounded-xl p-6 cursor-pointer transition-colors text-center"
      >
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-48 object-cover rounded-lg" />
        ) : (
          <>
            <p className="text-white/70 text-sm">Click para seleccionar foto</p>
            <p className="text-white/40 text-xs mt-1">JPG o PNG, máximo 8 MB</p>
          </>
        )}
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png" onChange={handleFile} className="hidden" />

      {preview && (
        <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}
          className="text-xs text-white/60 hover:text-white underline">
          Cambiar foto
        </button>
      )}

      {error && <p className="text-red-300 text-sm">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={!preview || loading}
        className="w-full bg-brand-red hover:bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50 transition-all"
      >
        {loading ? 'Subiendo...' : 'Enviar nueva foto'}
      </button>
    </div>
  );
}
