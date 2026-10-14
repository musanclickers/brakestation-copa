'use client';

import { useState } from 'react';
import { PhotoUpload } from '@brakestation/ui';

type Props = {
  userEmail: string;
  prefilledCode: string | null;
};

type Step = 'code' | 'photo' | 'personal_data' | 'affiliation' | 'submitting';

type AffiliationType = 'negocio' | 'consumidor';

const AFFILIATION_OPTIONS: { value: AffiliationType; label: string }[] = [
  { value: 'negocio', label: 'Soy parte del negocio que recibió la playera (dueño, socio, empleado, familia)' },
  { value: 'consumidor', label: 'Soy cliente del negocio que recibió la playera' },
];

const CLIENT_TEXT_LABELS: Record<AffiliationType, string> = {
  negocio: '¿De qué negocio eres?',
  consumidor: '¿En qué negocio obtuviste tu playera?',
};

function validatePhone(p: string): boolean {
  const digits = p.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('52'));
}

const INTERNAL_DEFAULT_CLIENT_TEXT = 'Brake Station';

export function TicketActivationFlow({ userEmail, prefilledCode }: Props) {
  const [step, setStep] = useState<Step>(prefilledCode ? 'photo' : 'code');
  const [ticketCode, setTicketCode] = useState(prefilledCode ?? '');
  const [photo, setPhoto] = useState<File | null>(null);
  const [participantName, setParticipantName] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [affiliationType, setAffiliationType] = useState<AffiliationType | null>(null);
  const [clientText, setClientText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rejectedNotes, setRejectedNotes] = useState<string | null>(null);

  const isInternalFolio = ticketCode.startsWith('INT-');

  async function handleVerifyTicket() {
    setError(null);
    const res = await fetch(`/api/tickets/verify?code=${encodeURIComponent(ticketCode)}`);
    const body = await res.json();

    if (!res.ok) {
      if (body.review_status === 'pending') {
        setError('Este boleto ya está en revisión. Te avisaremos cuando sea aprobado.');
      } else {
        setError(body.message ?? 'Código inválido o ya usado');
      }
      return;
    }

    if (!body.registration_required) {
      window.location.href = '/dashboard';
      return;
    }

    if (body.rejected) {
      setRejectedNotes(body.rejected.notes);
    }

    setStep('photo');
  }

  const visibleSteps: Step[] = isInternalFolio
    ? ['code', 'photo', 'personal_data']
    : ['code', 'photo', 'personal_data', 'affiliation'];
  const TOTAL_STEPS = visibleSteps.length;

  function getStepNumber(): number {
    const idx = visibleSteps.indexOf(step);
    return idx >= 0 ? idx + 1 : TOTAL_STEPS;
  }

  function getNextStep(fromStep: Step): Step {
    if (fromStep === 'photo') return 'personal_data';
    if (fromStep === 'personal_data') return isInternalFolio ? 'submitting' : 'affiliation';
    if (fromStep === 'affiliation') return 'submitting';
    return 'submitting';
  }

  function getPrevStep(fromStep: Step): Step {
    if (fromStep === 'photo') return 'code';
    if (fromStep === 'personal_data') return 'photo';
    if (fromStep === 'affiliation') return 'personal_data';
    return 'code';
  }

  function canAdvance(): boolean {
    switch (step) {
      case 'code': return /^(BS|CD|INT)-[A-Z]\d{3}$/.test(ticketCode);
      case 'photo': return photo !== null;
      case 'personal_data': return participantName.trim().length >= 2 && validatePhone(participantPhone);
      case 'affiliation':
        if (!affiliationType) return false;
        if (!clientText.trim()) return false;
        return true;
      default: return false;
    }
  }

  function handleNext() {
    if (!canAdvance()) return;

    if (step === 'code') {
      handleVerifyTicket();
      return;
    }

    const next = getNextStep(step);
    if (next === 'submitting') {
      handleSubmit();
    } else {
      setStep(next);
    }
  }

  function handleBack() {
    setError(null);
    setStep(getPrevStep(step));
  }

  async function handleSubmit() {
    setStep('submitting');
    setError(null);

    const formData = new FormData();
    formData.append('photo', photo!);
    formData.append('ticket_code', ticketCode);
    formData.append('participant_name', participantName.trim());
    const digits = participantPhone.replace(/\D/g, '');
    const normalizedPhone = digits.length === 10 ? `+52${digits}` : `+${digits}`;
    formData.append('participant_phone', normalizedPhone);
    formData.append('affiliation_type', isInternalFolio ? 'negocio' : affiliationType!);
    formData.append('client_text', isInternalFolio ? INTERNAL_DEFAULT_CLIENT_TEXT : clientText.trim());

    const fallbackStep: Step = isInternalFolio ? 'personal_data' : 'affiliation';
    try {
      const res = await fetch('/api/registration', { method: 'POST', body: formData });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Error al enviar el registro.');
        setStep(fallbackStep);
        return;
      }
      window.location.href = '/dashboard';
    } catch {
      setError('Error de conexión. Intenta de nuevo.');
      setStep(fallbackStep);
    }
  }

  if (step === 'submitting') {
    return (
      <div className="w-full max-w-md text-center py-12">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-red border-r-transparent mb-4" />
        <p className="text-white font-medium">Enviando registro...</p>
      </div>
    );
  }

  const stepNum = getStepNumber();
  const isLastStep = getNextStep(step) === 'submitting';
  const showBack = step !== 'code' && step !== 'photo';

  return (
    <div className="w-full max-w-md flex flex-col gap-6 backdrop-blur-xl bg-white/[0.08] border border-white/[0.15] rounded-2xl p-6">
      {/* Step indicator */}
      <div className="text-center">
        <span className="text-sm font-medium text-white/60">
          Paso {stepNum} de {TOTAL_STEPS}
        </span>
        <div className="mt-2 flex gap-1">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i < stepNum ? 'bg-brand-red' : 'bg-brand-navy/10'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step: Code entry */}
      {step === 'code' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-2xl text-white">Activa tu boleto</h2>
          <p className="text-sm text-white/60">Hola {userEmail}</p>
          <label htmlFor="ticket-code" className="text-sm font-medium text-white">
            Código del boleto
          </label>
          <input
            id="ticket-code"
            type="text"
            value={ticketCode}
            onChange={(e) => setTicketCode(e.target.value.toUpperCase().trim())}
            placeholder="BS-001"
            className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white text-center text-lg font-mono uppercase placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 focus:border-brand-red transition-all"
            autoFocus
          />
        </div>
      )}

      {/* Step: Photo */}
      {step === 'photo' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-white">Foto de verificación</h2>
          <p className="text-sm text-white/60">
            Sube una foto donde se vea la playera CanaBRAKE y la estampita con el código{' '}
            <strong>{ticketCode}</strong>.
          </p>
          {rejectedNotes && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-sm font-medium text-amber-800">Tu registro anterior fue rechazado:</p>
              <p className="text-sm text-amber-700">{rejectedNotes}</p>
            </div>
          )}
          <details className="rounded-xl border border-white/15 bg-white/[0.05]">
            <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-sm font-medium text-white/80 hover:text-white transition-colors list-none [&::-webkit-details-marker]:hidden">
              <svg className="w-4 h-4 text-brand-red flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Ver ejemplo de foto correcta
              <svg className="w-4 h-4 text-white/50 ml-auto transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
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
          <PhotoUpload onChange={setPhoto} />
        </div>
      )}

      {/* Step: Personal data */}
      {step === 'personal_data' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-white">Tus datos de contacto</h2>
          <p className="text-sm text-white/60">
            Necesitamos tus datos para poder contactarte si ganas un premio.
          </p>
          <div className="flex flex-col gap-3">
            <div>
              <label htmlFor="participant-name" className="text-sm font-medium text-white">
                Nombre completo *
              </label>
              <input
                id="participant-name"
                type="text"
                value={participantName}
                onChange={(e) => setParticipantName(e.target.value)}
                placeholder="Ej. Juan Pérez García"
                className="mt-1 w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 focus:border-brand-red transition-all"
                autoFocus
              />
            </div>
            <div>
              <label htmlFor="participant-phone" className="text-sm font-medium text-white">
                WhatsApp *
              </label>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-sm text-white/60">+52</span>
                <input
                  id="participant-phone"
                  type="tel"
                  value={participantPhone}
                  onChange={(e) => setParticipantPhone(e.target.value)}
                  placeholder="10 dígitos"
                  maxLength={10}
                  className="w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 focus:border-brand-red transition-all"
                />
              </div>
              <p className="mt-1 text-xs text-white/40">Solo lo usaremos para avisarte de tus premios.</p>
            </div>
          </div>
        </div>
      )}

      {/* Step: Affiliation */}
      {step === 'affiliation' && (
        <div className="flex flex-col gap-4">
          <h2 className="font-display text-xl text-white">¿Cómo recibiste esta playera?</h2>
          <div className="flex flex-col gap-3">
            {AFFILIATION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                  affiliationType === opt.value
                    ? 'border-brand-red bg-brand-red/5'
                    : 'border-white/20 hover:border-brand-navy/40'
                }`}
              >
                <input
                  type="radio"
                  name="affiliation"
                  value={opt.value}
                  checked={affiliationType === opt.value}
                  onChange={() => {
                    setAffiliationType(opt.value);
                    setClientText('');
                  }}
                  className="accent-brand-red"
                />
                <span className="text-sm text-white">{opt.label}</span>
              </label>
            ))}
          </div>

          {affiliationType && (
            <div>
              <label htmlFor="client-text" className="text-sm font-medium text-white">
                {CLIENT_TEXT_LABELS[affiliationType]}
              </label>
              <input
                id="client-text"
                type="text"
                value={clientText}
                onChange={(e) => setClientText(e.target.value)}
                placeholder="Nombre del negocio donde la recibiste"
                maxLength={120}
                className="mt-1 w-full rounded-xl bg-white/[0.10] border border-white/20 px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-brand-red/40 focus:bg-white/25 focus:border-brand-red transition-all"
              />
              <p className="mt-1 text-xs text-white/40">
                Escribe el nombre tal como lo conoces.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && <p className="text-sm text-red-300 text-center">{error}</p>}

      {/* Navigation */}
      <div className="flex gap-3">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 rounded-xl border border-white/20 px-6 py-3 text-white font-medium hover:bg-white/10 transition-colors"
          >
            Atrás
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={!canAdvance()}
          className="flex-1 rounded-xl bg-brand-red px-6 py-3 text-white font-semibold text-lg hover:bg-brand-red/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLastStep ? 'Activar mi participación' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
