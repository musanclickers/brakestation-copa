'use client';

import { useState } from 'react';

type Trivia = {
  id: string;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  category: string;
  answered: boolean;
  selectedOption: string | null;
  correctOption?: string | null;
  closed?: boolean;
};

type Props = {
  trivias: Trivia[];
  ticketCode: string;
  readOnly?: boolean;
};

export function TriviaList({ trivias, ticketCode, readOnly = false }: Props) {
  const [states, setStates] = useState<Record<string, { answered: boolean; selected: string | null; submitting: boolean; error: string | null }>>(
    () => Object.fromEntries(trivias.map((t) => [t.id, { answered: t.answered, selected: t.selectedOption, submitting: false, error: null }])),
  );

  const defaultState = { answered: false, selected: null as string | null, submitting: false, error: null as string | null };

  async function handleRespond(triviaId: string, option: string) {
    setStates((prev) => {
      const cur = prev[triviaId] ?? defaultState;
      return { ...prev, [triviaId]: { answered: cur.answered, selected: cur.selected, submitting: true, error: null } };
    });

    try {
      const res = await fetch(`/api/trivias/${triviaId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_code: ticketCode, selected_option: option }),
      });
      const data = await res.json();
      if (res.ok) {
        setStates((prev) => ({ ...prev, [triviaId]: { answered: true, selected: option, submitting: false, error: null } }));
      } else {
        const msg = data.error === 'already_responded' ? 'Ya respondiste esta trivia' : (data.error ?? 'Error');
        setStates((prev) => {
          const cur = prev[triviaId] ?? defaultState;
          return { ...prev, [triviaId]: { answered: cur.answered, selected: cur.selected, submitting: false, error: msg } };
        });
      }
    } catch {
      setStates((prev) => {
        const cur = prev[triviaId] ?? defaultState;
        return { ...prev, [triviaId]: { answered: cur.answered, selected: cur.selected, submitting: false, error: 'Error de conexión' } };
      });
    }
  }

  return (
    <div className="space-y-6">
      {trivias.map((t) => {
        const state = states[t.id] ?? defaultState;
        const options = [
          { key: 'a', label: t.optionA },
          { key: 'b', label: t.optionB },
          { key: 'c', label: t.optionC },
        ];
        const isClosed = !!t.closed;

        return (
          <article key={t.id} className="relative overflow-hidden rounded-3xl backdrop-blur-2xl saturate-150 bg-gradient-to-br from-white/[0.10] via-white/[0.04] to-white/[0.02] border border-white/[0.15] shadow-[0_20px_60px_rgba(0,0,0,0.35)] p-6 sm:p-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                t.category === 'futbol' ? 'bg-blue-500/20 text-blue-200' : 'bg-yellow-500/20 text-yellow-200'
              }`}>
                {t.category === 'futbol' ? '⚽ Fútbol' : '🏁 Marca'}
              </span>
              {isClosed && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/[0.10] text-white/60">
                  Cerrada
                </span>
              )}
              {readOnly && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-200">
                  Vista admin
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 leading-tight">{t.question}</h2>

            {state.error && (
              <p className="text-red-300 text-xs mb-3">{state.error}</p>
            )}

            <div className="space-y-3">
              {options.map((opt) => {
                const isSelected = state.selected === opt.key;
                const knowsAnswer = !!t.correctOption && (state.answered || readOnly);
                const isCorrectOption = knowsAnswer && t.correctOption === opt.key;
                const selectedIsRight = knowsAnswer && state.selected === t.correctOption;
                const disabled = readOnly || isClosed || state.answered || state.submitting;

                let className = 'bg-white/[0.08] text-white border border-white/15 hover:bg-white/[0.15] hover:border-white/25 cursor-pointer';
                if (isSelected && knowsAnswer) {
                  className = selectedIsRight
                    ? 'bg-emerald-500/25 text-emerald-50 border-2 border-emerald-400/70 shadow-lg'
                    : 'bg-red-500/25 text-red-50 border-2 border-red-400/70 shadow-lg';
                } else if (isSelected) {
                  className = 'bg-brand-red text-white border-2 border-brand-red shadow-lg';
                } else if (isCorrectOption) {
                  className = 'bg-emerald-500/15 text-emerald-100 border-2 border-emerald-400/50';
                } else if (disabled) {
                  className = 'bg-white/[0.04] text-white/40 border border-white/10 cursor-not-allowed';
                }

                return (
                  <button
                    key={opt.key}
                    onClick={() => handleRespond(t.id, opt.key)}
                    disabled={disabled}
                    className={`w-full text-left px-4 py-4 rounded-xl transition-all ${className}`}
                  >
                    <span className="font-bold mr-2">{opt.key.toUpperCase()})</span>
                    {opt.label}
                    {isSelected && knowsAnswer && (
                      <span className="ml-2 text-xs font-bold">
                        {selectedIsRight ? '✓ Tu respuesta — correcta' : '✗ Tu respuesta — incorrecta'}
                      </span>
                    )}
                    {!isSelected && isCorrectOption && (
                      <span className="ml-2 text-xs font-bold">✓ Correcta</span>
                    )}
                  </button>
                );
              })}
            </div>

            {state.answered && !readOnly && t.correctOption && (
              <div className={`mt-6 flex items-center gap-2 ${state.selected === t.correctOption ? 'text-emerald-300' : 'text-red-300'}`}>
                <span className="text-sm font-semibold">
                  {state.selected === t.correctOption
                    ? '✓ ¡Respuesta correcta! +2 puntos'
                    : '✗ Respuesta incorrecta'}
                </span>
              </div>
            )}
            {state.answered && !readOnly && !t.correctOption && (
              <div className="mt-6 flex items-center gap-2 text-emerald-300">
                <span className="text-sm font-semibold">✓ Respuesta registrada — sello generado</span>
              </div>
            )}
            {readOnly && !state.answered && (
              <div className="mt-6 flex items-center gap-2 text-white/50">
                <span className="text-sm">No respondió esta trivia</span>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
