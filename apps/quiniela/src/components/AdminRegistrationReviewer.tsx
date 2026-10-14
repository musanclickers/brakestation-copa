'use client';

import { Fragment, useState } from 'react';
import { SocialBonusToggle } from './SocialBonusToggle';

type SerializedRegistration = {
  id: string;
  userId: string;
  ticketCode: string;
  userName: string;
  userEmail: string;
  photoUrl: string;
  affiliationType: string;
  clientName: string | null;
  clientText: string | null;
  clientId: string | null;
  participantName: string;
  participantPhone: string;
  reviewStatus: string;
  reviewNotes: string | null;
  socialBonusGranted: boolean;
  createdAt: string;
};

type TabKey = 'pending' | 'approved' | 'rejected' | 'all' | 'internal' | 'public';

const AFFILIATION_LABELS: Record<string, string> = {
  negocio: 'Negocio',
  consumidor: 'Consumidor',
  trabajador_cliente: 'Negocio (legacy)',
  cliente_de_cliente: 'Consumidor (legacy)',
  cliente_directo: 'Negocio (legacy)',
};

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  return `hace ${days}d`;
}

export function AdminRegistrationReviewer({
  registrations: initial,
}: {
  registrations: SerializedRegistration[];
}) {
  const [registrations, setRegistrations] = useState(initial);
  const [activeTab, setActiveTab] = useState<TabKey>('public');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [newPhotoId, setNewPhotoId] = useState<string | null>(null);
  const [newPhotoReason, setNewPhotoReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [resendOk, setResendOk] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [reminderResult, setReminderResult] = useState<string | null>(null);

  const isInternal = (r: SerializedRegistration) => r.ticketCode.startsWith('INT-');

  const counts = {
    public: registrations.filter((r) => r.reviewStatus === 'approved' && !isInternal(r)).length,
    internal: registrations.filter(isInternal).length,
    rejected: registrations.filter((r) => r.reviewStatus === 'rejected' && !isInternal(r)).length,
    all: registrations.filter((r) => !isInternal(r)).length,
    // kept for type completeness; not displayed as a tab anymore
    approved: 0,
    pending: 0,
  };

  const filtered =
    activeTab === 'internal'
      ? registrations.filter(isInternal)
      : activeTab === 'all'
      ? registrations.filter((r) => !isInternal(r))
      : activeTab === 'public'
      ? registrations.filter((r) => r.reviewStatus === 'approved' && !isInternal(r))
      : registrations.filter((r) => r.reviewStatus === activeTab && !isInternal(r));

  async function handleApprove(id: string) {
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: 'approved' }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, reviewStatus: 'approved', reviewNotes: null } : r,
          ),
        );
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleRevertRejection(id: string, ticketCode: string) {
    if (
      !confirm(
        `Revertir rechazo del boleto ${ticketCode}?\n\nEl registro volverá a "Pendiente" para que cualquier admin lo vuelva a revisar.`,
      )
    )
      return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}/revert-rejection`, {
        method: 'POST',
      });
      if (!res.ok) {
        const body = await res.json();
        alert(body.message ?? 'Error al revertir');
        return;
      }
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, reviewStatus: 'pending' } : r,
        ),
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleResendEmail(id: string) {
    setResendingId(id);
    setResendOk(null);
    try {
      const res = await fetch(`/api/admin/registrations/${id}/resend-email`, {
        method: 'POST',
      });
      if (res.ok) {
        setResendOk(id);
        setTimeout(() => setResendOk((prev) => (prev === id ? null : prev)), 3000);
      } else {
        const body = await res.json();
        alert(body.message ?? 'Error al reenviar');
      }
    } finally {
      setResendingId(null);
    }
  }

  async function handleReject(id: string) {
    if (rejectNotes.trim().length < 10) return;
    setLoading(id);
    try {
      const res = await fetch(`/api/admin/registrations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          review_status: 'rejected',
          review_notes: rejectNotes.trim(),
        }),
      });
      if (res.ok) {
        setRegistrations((prev) =>
          prev.map((r) =>
            r.id === id
              ? { ...r, reviewStatus: 'rejected', reviewNotes: rejectNotes.trim() }
              : r,
          ),
        );
        setRejectingId(null);
        setRejectNotes('');
      }
    } finally {
      setLoading(null);
    }
  }

  async function handleSendReminders(channel: 'email' | 'whatsapp') {
    const label = channel === 'email' ? 'email' : 'WhatsApp';
    const warning = channel === 'whatsapp'
      ? '\n\nSe envían en lotes de 20 con 10s entre mensajes (~3 min por lote). Los ya enviados se omiten.'
      : '';
    if (!confirm(`¿Enviar recordatorio por ${label} a participantes aprobados que NO han sellado la fase actual?${warning}`)) return;
    const setSending = channel === 'email' ? setSendingEmail : setSendingWa;
    setSending(true);
    setReminderResult(channel === 'whatsapp' ? 'Enviando lote de WhatsApp...' : null);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10 * 60 * 1000);
      const res = await fetch(`/api/admin/reminders/unseal?channel=${channel}`, {
        method: 'POST',
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) {
        setReminderResult(data.message ?? 'Error al enviar');
      } else if (data.total === 0) {
        setReminderResult(data.message ?? 'Todos ya sellaron');
      } else if (channel === 'whatsapp') {
        const parts = [`${data.whatsappSent} WhatsApp enviados en este lote`];
        if (data.alreadySent > 0) parts.push(`${data.alreadySent} ya enviados antes`);
        if (data.remaining > 0) parts.push(`quedan ${data.remaining} por enviar`);
        else parts.push('todos enviados');
        setReminderResult(`${parts.join(' · ')} (${data.phaseLabel})`);
      } else {
        setReminderResult(`${data.emailsSent} emails enviados (${data.total} sin sellar — ${data.phaseLabel})`);
      }
    } catch {
      setReminderResult('Error de conexión o timeout');
    } finally {
      setSending(false);
    }
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'public', label: 'Públicos' },
    { key: 'internal', label: 'Internos' },
    { key: 'rejected', label: 'Rechazados' },
    { key: 'all', label: 'Todos' },
  ];

  return (
    <div>
      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <button
          onClick={() => handleSendReminders('email')}
          disabled={sendingEmail}
          className="bg-amber-600 hover:bg-amber-700 text-white text-sm px-4 py-2 rounded-xl font-medium disabled:opacity-50 transition-colors"
        >
          {sendingEmail ? 'Enviando...' : 'Recordatorio por Email'}
        </button>
        {/* WhatsApp reminder button hidden — re-enable when new number linked */}
        <a
          href="/api/admin/registrations/export"
          className="border border-white/20 text-white/80 hover:bg-white/[0.08] text-sm px-4 py-2 rounded-xl font-medium transition-colors"
        >
          CSV sin pronósticos
        </a>
        <a
          href="/api/admin/registrations/export?phase=j2,j3"
          className="border border-white/20 text-white/80 hover:bg-white/[0.08] text-sm px-4 py-2 rounded-xl font-medium transition-colors"
        >
          CSV sin sellar J2/J3
        </a>
        <a
          href="/api/admin/registrations/export-all"
          className="border border-white/20 text-white/80 hover:bg-white/[0.08] text-sm px-4 py-2 rounded-xl font-medium transition-colors"
        >
          CSV todos
        </a>
        {reminderResult && (
          <span className="text-sm text-white/70">{reminderResult}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto flex-nowrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white/[0.15] text-white'
                : 'text-white/60 hover:bg-white/[0.05]'
            }`}
          >
            {tab.label}
            <span
              className={`ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                activeTab === tab.key
                  ? 'bg-white/20 text-white'
                  : 'bg-white/[0.15]/10 text-white/60'
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-white/80 font-medium mb-1">No hay registros en esta categoría</p>
          <p className="text-white/50 text-sm">Cuando lleguen activaciones aparecerán aquí.</p>
        </div>
      ) : (
        <>
          {/* ── Mobile card view (<md) ── */}
          <div className="md:hidden flex flex-col gap-4">
            {filtered.map((r) => (
              <div
                key={r.id}
                className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-4 flex flex-col gap-3"
              >
                {/* Top row: photo + ticket + status badge */}
                <div className="flex items-center gap-3">
                  <a href={r.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <img
                      src={r.photoUrl}
                      alt={`Foto ${r.ticketCode}`}
                      className="w-[80px] h-[80px] rounded-xl object-cover border border-white/20"
                    />
                  </a>
                  <div className="flex flex-col gap-1 min-w-0">
                    <span className="font-mono text-sm font-bold text-white">{r.ticketCode}</span>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full self-start ${
                        r.reviewStatus === 'approved'
                          ? 'bg-emerald-500/20 text-emerald-200'
                          : r.reviewStatus === 'awaiting_new_photo'
                          ? 'bg-amber-500/20 text-amber-200'
                          : r.reviewStatus === 'rejected'
                          ? 'bg-red-500/20 text-red-200'
                          : 'bg-white/[0.12] text-white/70'
                      }`}
                    >
                      {r.reviewStatus === 'approved'
                        ? 'Aprobado'
                        : r.reviewStatus === 'awaiting_new_photo'
                        ? 'Esperando foto'
                        : r.reviewStatus === 'rejected'
                        ? 'Rechazado'
                        : 'Pendiente'}
                    </span>
                  </div>
                </div>

                {/* Participant name */}
                <p className="font-semibold text-white text-sm">{r.participantName}</p>

                {/* Email + phone */}
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-white/55">
                  <span>{r.userEmail}</span>
                  <span>{r.participantPhone}</span>
                </div>

                {/* Affiliation + client info */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex px-2 py-1 rounded-full bg-blue-500/15 text-blue-200 font-medium">
                    {AFFILIATION_LABELS[r.affiliationType] ?? r.affiliationType}
                  </span>
                  <span className="text-white/70">
                    {r.clientText ?? <span className="text-white/50 italic">--</span>}
                  </span>
                </div>

                {/* Social bonus toggle + resend email (approved only) */}
                {r.reviewStatus === 'approved' && (
                  <div className="flex items-center gap-4 text-xs text-white/70">
                    <div className="flex items-center gap-2">
                      <span>Social:</span>
                      <SocialBonusToggle registrationId={r.id} granted={r.socialBonusGranted} />
                    </div>
                    <button
                      onClick={() => handleResendEmail(r.id)}
                      disabled={resendingId === r.id}
                      className="text-blue-300 hover:text-blue-200 hover:underline disabled:opacity-50 disabled:no-underline"
                    >
                      {resendOk === r.id ? 'Enviado!' : resendingId === r.id ? 'Enviando...' : 'Reenviar email'}
                    </button>
                  </div>
                )}

                {/* Relative time + view as user */}
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-white/50">{relativeDate(r.createdAt)}</span>
                  <a
                    href={`/dashboard?as=${r.userId}`}
                    className="text-blue-300 hover:text-blue-200 hover:underline"
                  >
                    Ver dashboard →
                  </a>
                </div>

                {/* Rejected reason */}
                {r.reviewStatus === 'rejected' && r.reviewNotes && (
                  <p className="text-white/50 text-xs">Motivo: {r.reviewNotes}</p>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2 pt-1 border-t border-white/[0.08]">
                  {(r.reviewStatus === 'pending' || r.reviewStatus === 'awaiting_new_photo') ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        disabled={loading === r.id}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                      >
                        Aprobar
                      </button>
                      {r.reviewStatus === 'pending' && (
                        <button
                          onClick={() => {
                            setNewPhotoId(r.id);
                            setNewPhotoReason('');
                            setRejectingId(null);
                          }}
                          disabled={loading === r.id}
                          className="flex-1 border border-amber-500/50 text-amber-200 text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-amber-500/10 transition-colors"
                        >
                          Nueva foto
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setRejectingId(r.id);
                          setRejectNotes('');
                          setNewPhotoId(null);
                        }}
                        disabled={loading === r.id}
                        className="flex-1 border border-red-500/50 text-red-300 text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                      >
                        Rechazar
                      </button>
                    </div>
                  ) : r.reviewStatus === 'approved' ? (
                    <button
                      onClick={() => {
                        setRejectingId(r.id);
                        setRejectNotes('');
                        setNewPhotoId(null);
                      }}
                      disabled={loading === r.id}
                      className="w-full border border-red-500/50 text-red-300 text-xs px-3 py-2 rounded-lg font-medium disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                    >
                      Rechazar
                    </button>
                  ) : r.reviewStatus === 'rejected' ? (
                    <button
                      onClick={() => handleRevertRejection(r.id, r.ticketCode)}
                      disabled={loading === r.id}
                      className="w-full text-xs px-3 py-2 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 font-semibold disabled:opacity-50 transition"
                    >
                      {loading === r.id ? '...' : 'Revertir rechazo'}
                    </button>
                  ) : null}
                </div>

                {/* Inline reject form (mobile) */}
                {rejectingId === r.id && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-200 mb-2">
                      Motivo del rechazo (min. 10 caracteres)
                    </p>
                    <textarea
                      value={rejectNotes}
                      onChange={(e) => setRejectNotes(e.target.value)}
                      placeholder="Escribe el motivo del rechazo..."
                      className="w-full bg-white/[0.10] border border-red-500/30 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-white/40"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleReject(r.id)}
                        disabled={rejectNotes.trim().length < 10 || loading === r.id}
                        className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                      >
                        Confirmar rechazo
                      </button>
                      <button
                        onClick={() => { setRejectingId(null); setRejectNotes(''); }}
                        className="text-white/60 text-xs px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Inline new-photo form (mobile) */}
                {newPhotoId === r.id && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                    <p className="text-sm font-medium text-amber-200 mb-2">Solicitar nueva foto (min. 10 caracteres)</p>
                    <textarea
                      value={newPhotoReason}
                      onChange={(e) => setNewPhotoReason(e.target.value)}
                      placeholder="Ej: La foto está muy borrosa, no se ve el código del boleto..."
                      className="w-full bg-white/[0.10] border border-amber-500/30 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-white/40"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={async () => {
                          if (newPhotoReason.trim().length < 10) return;
                          setLoading(r.id);
                          try {
                            const res = await fetch(`/api/admin/registrations/${r.id}/request-new-photo`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ reason: newPhotoReason.trim() }),
                            });
                            if (res.ok) {
                              setRegistrations((prev) => prev.map((reg) => reg.id === r.id ? { ...reg, reviewStatus: 'awaiting_new_photo', reviewNotes: newPhotoReason.trim() } : reg));
                              setNewPhotoId(null);
                              setNewPhotoReason('');
                            }
                          } finally {
                            setLoading(null);
                          }
                        }}
                        disabled={newPhotoReason.trim().length < 10 || loading === r.id}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                      >
                        Enviar solicitud
                      </button>
                      <button
                        onClick={() => { setNewPhotoId(null); setNewPhotoReason(''); }}
                        className="text-white/60 text-xs px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Desktop table view (md+) ── */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.05]">
                <tr className="border-b border-white/15 text-left">
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Foto</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Ticket</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Participante</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Teléfono</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Afiliación</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Cliente declarado</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Social</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Subido</th>
                  <th className="px-3 py-3 text-white/80 font-semibold uppercase text-xs tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-b border-white/[0.08] align-top hover:bg-white/[0.04] transition-colors">
                      <td className="px-3 py-3">
                        <a href={r.photoUrl} target="_blank" rel="noopener noreferrer">
                          <img src={r.photoUrl} alt={`Foto ${r.ticketCode}`} className="w-[60px] h-[60px] rounded-lg object-cover border border-white/20" />
                        </a>
                      </td>

                      <td className="px-3 py-3 font-mono text-sm font-semibold text-white">
                        {r.ticketCode}
                      </td>

                      <td className="px-3 py-3">
                        <p className="font-medium text-white">{r.participantName}</p>
                        <p className="text-white/65 text-xs mt-0.5">{r.userEmail}</p>
                      </td>

                      <td className="px-3 py-3 text-white/85 text-xs">
                        {r.participantPhone}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        <span className="inline-flex px-2 py-1 rounded-full bg-blue-500/15 text-blue-200 text-xs font-medium">
                          {AFFILIATION_LABELS[r.affiliationType] ?? r.affiliationType}
                        </span>
                      </td>

                      <td className="px-3 py-3 text-white/85 text-xs">
                        {r.clientText ?? <span className="text-white/50 italic">—</span>}
                      </td>

                      <td className="px-3 py-3">
                        {r.reviewStatus === 'approved' ? (
                          <SocialBonusToggle registrationId={r.id} granted={r.socialBonusGranted} />
                        ) : (
                          <span className="text-white/40 italic text-xs">N/A</span>
                        )}
                      </td>

                      <td className="px-3 py-3 text-xs">
                        <p className="text-white/60">{relativeDate(r.createdAt)}</p>
                        <a
                          href={`/dashboard?as=${r.userId}`}
                          className="text-blue-300 hover:text-blue-200 hover:underline"
                        >
                          Ver dashboard →
                        </a>
                      </td>

                      {/* Actions */}
                      <td className="py-2">
                        {(r.reviewStatus === 'pending' || r.reviewStatus === 'awaiting_new_photo') ? (
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => handleApprove(r.id)}
                              disabled={loading === r.id}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
                            >
                              Aprobar
                            </button>
                            {r.reviewStatus === 'pending' && (
                              <button
                                onClick={() => {
                                  setNewPhotoId(r.id);
                                  setNewPhotoReason('');
                                  setRejectingId(null);
                                }}
                                disabled={loading === r.id}
                                className="border border-amber-500/50 text-amber-200 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 hover:bg-amber-500/10 transition-colors"
                              >
                                Nueva foto
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setRejectingId(r.id);
                                setRejectNotes('');
                                setNewPhotoId(null);
                              }}
                              disabled={loading === r.id}
                              className="border border-red-500/50 text-red-300 text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                            >
                              Rechazar
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2 items-start">
                            <span
                              className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                                r.reviewStatus === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-200'
                                  : 'bg-red-500/20 text-red-200'
                              }`}
                            >
                              {r.reviewStatus === 'approved'
                                ? 'Aprobado'
                                : 'Rechazado'}
                            </span>
                            {r.reviewStatus === 'approved' && (
                              <>
                                <button
                                  onClick={() => handleResendEmail(r.id)}
                                  disabled={resendingId === r.id}
                                  className="text-xs text-blue-300 hover:text-blue-200 hover:underline disabled:opacity-50"
                                >
                                  {resendOk === r.id ? 'Enviado!' : resendingId === r.id ? 'Enviando...' : 'Reenviar email'}
                                </button>
                                <button
                                  onClick={() => {
                                    setRejectingId(r.id);
                                    setRejectNotes('');
                                    setNewPhotoId(null);
                                  }}
                                  disabled={loading === r.id}
                                  className="text-xs px-3 py-1.5 rounded-lg border border-red-500/50 text-red-300 font-medium disabled:opacity-50 hover:bg-red-500/10 transition-colors"
                                >
                                  Rechazar
                                </button>
                              </>
                            )}
                            {r.reviewStatus === 'rejected' && (
                              <>
                                {r.reviewNotes && (
                                  <p className="text-white/50 text-xs max-w-[200px] truncate" title={r.reviewNotes}>
                                    Motivo: {r.reviewNotes}
                                  </p>
                                )}
                                <button
                                  onClick={() => handleRevertRejection(r.id, r.ticketCode)}
                                  disabled={loading === r.id}
                                  className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border border-amber-500/40 font-semibold disabled:opacity-50 transition"
                                >
                                  {loading === r.id ? '...' : 'Revertir rechazo'}
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>

                    {/* Inline reject form */}
                    {rejectingId === r.id && (
                      <tr className="border-b border-white/10">
                        <td colSpan={10} className="py-3 px-2">
                          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-lg">
                            <p className="text-sm font-medium text-red-200 mb-2">
                              Motivo del rechazo (min. 10 caracteres)
                            </p>
                            <textarea
                              value={rejectNotes}
                              onChange={(e) => setRejectNotes(e.target.value)}
                              placeholder="Escribe el motivo del rechazo..."
                              className="w-full bg-white/[0.10] border border-red-500/30 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-red-400/40 placeholder:text-white/40"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleReject(r.id)}
                                disabled={
                                  rejectNotes.trim().length < 10 ||
                                  loading === r.id
                                }
                                className="bg-red-600 hover:bg-red-700 text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                              >
                                Confirmar rechazo
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingId(null);
                                  setRejectNotes('');
                                }}
                                className="text-white/60 text-xs px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}

                    {newPhotoId === r.id && (
                      <tr className="border-b border-white/10">
                        <td colSpan={10} className="py-3 px-2">
                          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 max-w-lg">
                            <p className="text-sm font-medium text-amber-200 mb-2">Solicitar nueva foto (min. 10 caracteres)</p>
                            <textarea
                              value={newPhotoReason}
                              onChange={(e) => setNewPhotoReason(e.target.value)}
                              placeholder="Ej: La foto está muy borrosa, no se ve el código del boleto..."
                              className="w-full bg-white/[0.10] border border-amber-500/30 rounded-lg p-2 text-sm text-white resize-none h-20 focus:outline-none focus:ring-2 focus:ring-amber-400/40 placeholder:text-white/40"
                            />
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={async () => {
                                  if (newPhotoReason.trim().length < 10) return;
                                  setLoading(r.id);
                                  try {
                                    const res = await fetch(`/api/admin/registrations/${r.id}/request-new-photo`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ reason: newPhotoReason.trim() }),
                                    });
                                    if (res.ok) {
                                      setRegistrations((prev) => prev.map((reg) => reg.id === r.id ? { ...reg, reviewStatus: 'awaiting_new_photo', reviewNotes: newPhotoReason.trim() } : reg));
                                      setNewPhotoId(null);
                                      setNewPhotoReason('');
                                    }
                                  } finally {
                                    setLoading(null);
                                  }
                                }}
                                disabled={newPhotoReason.trim().length < 10 || loading === r.id}
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                              >
                                Enviar solicitud
                              </button>
                              <button
                                onClick={() => { setNewPhotoId(null); setNewPhotoReason(''); }}
                                className="text-white/60 text-xs px-4 py-2 rounded-lg hover:bg-white/[0.05] transition-colors"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
