'use client';

import { useState, useRef, useCallback } from 'react';

export type PhotoUploadProps = {
  onChange: (file: File | null) => void;
  maxSizeBytes?: number;
  helperText?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export function PhotoUpload({
  onChange,
  maxSizeBytes = 8 * 1024 * 1024,
  helperText = 'Toma una foto con la playera y el codigo del boleto visible',
}: PhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setPreview(null);
        setError(null);
        onChange(null);
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Solo se permiten fotos en formato JPG o PNG');
        setPreview(null);
        onChange(null);
        return;
      }

      if (file.size > maxSizeBytes) {
        setError(
          `La foto no debe superar ${(maxSizeBytes / 1024 / 1024).toFixed(0)} MB`,
        );
        setPreview(null);
        onChange(null);
        return;
      }

      setError(null);

      // Revoke old preview URL to avoid memory leaks
      if (preview) {
        URL.revokeObjectURL(preview);
      }

      const url = URL.createObjectURL(file);
      setPreview(url);
      onChange(file);
    },
    [maxSizeBytes, onChange, preview],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    handleFile(file);
    // Reset the input so the same file can be re-selected
    e.target.value = '';
  };

  const btnClass =
    'border border-white/25 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-white/[0.10] hover:bg-white/[0.18] transition-colors';

  return (
    <div className="flex flex-col gap-3">
      {helperText && (
        <p className="text-sm text-white/70">{helperText}</p>
      )}

      {/* Hidden file inputs */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleInputChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={handleInputChange}
      />

      {preview ? (
        <div className="flex flex-col items-center gap-3">
          <img
            src={preview}
            alt="Vista previa"
            className="max-h-64 rounded-lg border border-white/25 object-contain"
          />
          <button
            type="button"
            className={btnClass}
            onClick={() => cameraRef.current?.click()}
          >
            Cambiar foto
          </button>
        </div>
      ) : (
        <div className="flex gap-3">
          <button
            type="button"
            className={btnClass}
            onClick={() => cameraRef.current?.click()}
          >
            Tomar foto
          </button>
          <button
            type="button"
            className={btnClass}
            onClick={() => galleryRef.current?.click()}
          >
            Elegir de galeria
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
    </div>
  );
}
