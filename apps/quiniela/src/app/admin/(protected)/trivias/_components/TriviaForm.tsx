'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export type TriviaFormValues = {
  id?: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  correctOption: 'a' | 'b' | 'c';
  opensAt: string; // datetime-local string
  closesAt: string;
  category: 'futbol' | 'marca';
  phaseLabel: string;
};

const PHASE_OPTIONS = [
  'groups_m1', 'groups_m2', 'groups_m3', 'r32', 'r16', 'qf', 'sf', 'final_phase',
] as const;

type Props = { initial?: TriviaFormValues; mode: 'create' | 'edit' };

export function TriviaForm({ initial, mode }: Props) {
  const router = useRouter();
  const [v, setV] = useState<TriviaFormValues>(
    initial ?? {
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      correctOption: 'a',
      opensAt: '',
      closesAt: '',
      category: 'futbol',
      phaseLabel: 'groups_m2',
    },
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (new Date(v.closesAt) <= new Date(v.opensAt)) {
      setError('closesAt debe ser posterior a opensAt');
      return;
    }
    setSubmitting(true);
    try {
      const url = mode === 'create' ? '/api/admin/trivias' : `/api/admin/trivias/${initial!.id}`;
      const method = mode === 'create' ? 'POST' : 'PATCH';
      const payload = {
        question: v.question,
        optionA: v.optionA,
        optionB: v.optionB,
        optionC: v.optionC,
        correctOption: v.correctOption,
        opensAt: new Date(v.opensAt).toISOString(),
        closesAt: new Date(v.closesAt).toISOString(),
        category: v.category,
        phaseLabel: v.phaseLabel,
      };
      const res = await fetch(url, {
        method,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      router.push('/admin/trivias');
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-2xl mx-auto p-4 md:p-8 text-white space-y-4">
      <h1 className="font-display text-2xl">
        {mode === 'create' ? 'Nueva trivia' : 'Editar trivia'}
      </h1>

      <label className="block">
        <span className="text-sm font-semibold">Pregunta</span>
        <textarea
          required
          value={v.question}
          onChange={(e) => setV({ ...v, question: e.target.value })}
          className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
          rows={3}
        />
      </label>

      {(['A', 'B', 'C'] as const).map((letter) => {
        const key = `option${letter}` as 'optionA' | 'optionB' | 'optionC';
        return (
          <label key={letter} className="block">
            <span className="text-sm font-semibold">Opción {letter}</span>
            <input
              required
              value={v[key]}
              onChange={(e) => setV({ ...v, [key]: e.target.value })}
              className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
            />
          </label>
        );
      })}

      <label className="block">
        <span className="text-sm font-semibold">Respuesta correcta</span>
        <select
          value={v.correctOption}
          onChange={(e) => setV({ ...v, correctOption: e.target.value as 'a' | 'b' | 'c' })}
          className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
        >
          <option value="a" className="text-black">A</option>
          <option value="b" className="text-black">B</option>
          <option value="c" className="text-black">C</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Abre</span>
          <input
            type="datetime-local"
            required
            value={v.opensAt}
            onChange={(e) => setV({ ...v, opensAt: e.target.value })}
            className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Cierra</span>
          <input
            type="datetime-local"
            required
            value={v.closesAt}
            onChange={(e) => setV({ ...v, closesAt: e.target.value })}
            className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm font-semibold">Categoría</span>
          <select
            value={v.category}
            onChange={(e) => setV({ ...v, category: e.target.value as 'futbol' | 'marca' })}
            className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
          >
            <option value="futbol" className="text-black">Fútbol</option>
            <option value="marca" className="text-black">Marca (CanaBRAKE)</option>
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-semibold">Fase</span>
          <select
            value={v.phaseLabel}
            onChange={(e) => setV({ ...v, phaseLabel: e.target.value })}
            className="mt-1 w-full bg-white/10 border border-white/20 rounded p-2 text-sm"
          >
            {PHASE_OPTIONS.map((p) => (
              <option key={p} value={p} className="text-black">{p}</option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white font-semibold py-3 rounded"
      >
        {submitting ? 'Guardando…' : mode === 'create' ? 'Crear trivia' : 'Guardar cambios'}
      </button>
    </form>
  );
}
