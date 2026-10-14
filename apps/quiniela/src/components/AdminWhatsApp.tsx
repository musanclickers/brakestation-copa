'use client';

import { useState, useEffect, useRef } from 'react';

type Status = { connected: boolean; phone: string | null };

const MESSAGE_TEMPLATES = [
  { key: 'approved', label: 'Aprobado' },
  { key: 'rejected', label: 'Rechazado' },
  { key: 'new_photo', label: 'Nueva foto' },
  { key: 'reminder', label: 'Recordatorio sellar' },
  { key: 'sealed', label: 'Comprobante sellado' },
] as const;

export function AdminWhatsApp() {
  const [status, setStatus] = useState<Status | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastQrRef = useRef<string | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testTemplate, setTestTemplate] = useState<string>('approved');
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  async function pollQr() {
    try {
      const res = await fetch('/api/admin/whatsapp/qr');
      if (!res.ok) return;
      const data = await res.json();
      if (data.type === 'qr') {
        if (data.data !== lastQrRef.current) {
          lastQrRef.current = data.data;
          setQrImage(data.data);
        }
      } else if (data.type === 'connected') {
        setStatus({ connected: true, phone: data.phone });
        setQrImage(null);
        lastQrRef.current = null;
        stopPolling();
      }
    } catch {}
  }

  function startPolling() {
    stopPolling();
    lastQrRef.current = null;
    pollQr();
    pollingRef.current = setInterval(pollQr, 5000);
  }

  useEffect(() => {
    fetch('/api/admin/whatsapp/status')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Status | null) => {
        const s = data ?? { connected: false, phone: null };
        setStatus(s);
        setLoading(false);
        if (!s.connected) {
          startPolling();
        }
      })
      .catch(() => {
        setStatus({ connected: false, phone: null });
        setLoading(false);
        startPolling();
      });

    return () => stopPolling();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch('/api/admin/whatsapp/logout', { method: 'POST' });
      setStatus({ connected: false, phone: null });
      setQrImage(null);
      startPolling();
    } finally {
      setLoggingOut(false);
    }
  }

  async function handleReconnect() {
    setQrImage(null);
    startPolling();
  }

  if (loading) {
    return (
      <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-12 text-center">
        <p className="text-white/60">Consultando estado de WhatsApp...</p>
      </div>
    );
  }

  async function handleTestSend() {
    if (!testPhone.trim()) return;
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/admin/whatsapp/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: testPhone.trim(), template: testTemplate }),
      });
      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult('Mensaje enviado');
      } else {
        setTestResult(data.error ?? 'Error al enviar');
      }
    } catch {
      setTestResult('Error de conexión');
    } finally {
      setTestSending(false);
    }
  }

  if (status?.connected) {
    return (
      <div className="space-y-6">
        <div className="backdrop-blur-xl bg-green-500/10 border border-green-400/30 rounded-2xl p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <h2 className="text-xl font-bold text-green-300">Conectado</h2>
          </div>
          <p className="text-white/80 mb-1">
            Número vinculado: <span className="font-mono font-bold text-white">{status.phone}</span>
          </p>
          <p className="text-white/50 text-sm mb-6">
            Los mensajes de notificación se enviarán desde este número.
          </p>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="border border-red-500/50 text-red-300 text-sm px-5 py-2.5 rounded-xl font-medium disabled:opacity-50 hover:bg-red-500/10 transition-colors"
          >
            {loggingOut ? 'Desvinculando...' : 'Desvincular número'}
          </button>
        </div>

        {/* Test send section */}
        <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-8">
          <h3 className="text-lg font-bold text-white mb-4">Prueba de envío</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm text-white/70 mb-1 block">Número destino</label>
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+52 999 123 4567"
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-green-400/40"
              />
            </div>
            <div>
              <label className="text-sm text-white/70 mb-1 block">Plantilla de mensaje</label>
              <select
                value={testTemplate}
                onChange={(e) => setTestTemplate(e.target.value)}
                className="w-full bg-white/[0.08] border border-white/[0.15] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-400/40 [&>option]:bg-gray-900"
              >
                {MESSAGE_TEMPLATES.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleTestSend}
                disabled={testSending || !testPhone.trim()}
                className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium disabled:opacity-50 transition-colors"
              >
                {testSending ? 'Enviando...' : 'Enviar prueba'}
              </button>
              {testResult && (
                <span className={`text-sm ${testResult === 'Mensaje enviado' ? 'text-green-300' : 'text-red-300'}`}>
                  {testResult}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="backdrop-blur-xl bg-white/[0.06] border border-white/[0.12] rounded-2xl p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 rounded-full bg-red-400" />
        <h2 className="text-xl font-bold text-white/80">Desconectado</h2>
      </div>
      <p className="text-white/60 text-sm mb-6">
        Escanea el código QR con WhatsApp para vincular un número.
      </p>

      {qrImage ? (
        <div className="flex flex-col items-center gap-4">
          <div className="bg-white p-4 rounded-2xl">
            <img src={qrImage} alt="QR WhatsApp" className="w-64 h-64" />
          </div>
          <p className="text-white/40 text-xs">
            Abre WhatsApp &rarr; Dispositivos vinculados &rarr; Vincular un dispositivo
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-white/50 mb-4">Esperando código QR...</p>
          <button
            onClick={handleReconnect}
            className="bg-green-600 hover:bg-green-700 text-white text-sm px-5 py-2.5 rounded-xl font-medium transition-colors"
          >
            Reintentar conexión
          </button>
        </div>
      )}
    </div>
  );
}
