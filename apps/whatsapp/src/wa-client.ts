import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  Browsers,
  WASocket,
  ConnectionState,
} from '@whiskeysockets/baileys';
import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
import pino from 'pino';

const AUTH_DIR = process.env.WA_AUTH_DIR || path.join(process.cwd(), 'auth_state');
const MAX_CONSECUTIVE_FAILURES = 5;

export type WAStatus = { connected: boolean; phone: string | null };

class WhatsAppClient extends EventEmitter {
  private sock: WASocket | null = null;
  private _connected = false;
  private _phone: string | null = null;
  private _qr: string | null = null;
  private reconnecting = false;
  private _connecting = false;
  private consecutiveFailures = 0;

  get status(): WAStatus {
    return { connected: this._connected, phone: this._phone };
  }

  get currentQr(): string | null {
    return this._qr;
  }

  get isIdle(): boolean {
    return !this._connected && !this._qr && !this._connecting && !this.reconnecting;
  }

  get debugState() {
    return {
      connected: this._connected,
      connecting: this._connecting,
      reconnecting: this.reconnecting,
      hasQr: !!this._qr,
      phone: this._phone,
      hasSock: !!this.sock,
      isIdle: this.isIdle,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  async ensureConnecting() {
    if (this.isIdle) {
      console.log('[whatsapp] idle — starting fresh connection for QR');
      this.consecutiveFailures = 0;
      await this.connect();
    }
  }

  async connect() {
    console.log('[whatsapp] connect() called, state:', JSON.stringify(this.debugState));
    this._connecting = true;

    try {
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      const { version } = await fetchLatestBaileysVersion();
      console.log('[whatsapp] using WA version:', JSON.stringify(version));

      const logger = pino({ level: 'silent' });

      this.sock = makeWASocket({
        auth: state,
        version,
        logger,
        browser: Browsers.ubuntu('Chrome'),
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', (update: Partial<ConnectionState>) => {
        const { connection, lastDisconnect, qr } = update;
        console.log('[whatsapp] connection.update:', JSON.stringify({ connection, hasQr: !!qr, qrLen: qr?.length }));

        if (qr) {
          this._qr = qr;
          this._connecting = false;
          this._connected = false;
          this.consecutiveFailures = 0;
          console.log('[whatsapp] QR received, length:', qr.length);
          this.emit('qr', qr);
        }

        if (connection === 'open') {
          this._connected = true;
          this._connecting = false;
          this._qr = null;
          this.consecutiveFailures = 0;
          this._phone = this.sock?.user?.id?.split(':')[0] ?? null;
          console.log(`[whatsapp] connected as ${this._phone}`);
          this.emit('connected', this._phone);
        }

        if (connection === 'close') {
          this._connected = false;
          this._connecting = false;
          this._phone = null;
          this._qr = null;

          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const errorMsg = lastDisconnect?.error?.message;
          console.log('[whatsapp] closed, statusCode:', statusCode, 'error:', errorMsg, 'failures:', this.consecutiveFailures);

          this.consecutiveFailures++;

          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          const isUnknownError = statusCode && !(statusCode in DisconnectReason);
          const tooManyFailures = this.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES;

          if (isLoggedOut || tooManyFailures) {
            console.log('[whatsapp] stopping reconnect — reason:',
              isLoggedOut ? 'loggedOut' : `${this.consecutiveFailures} consecutive failures`
            );
            this.clearAuthState();
            this.consecutiveFailures = 0;
            this.emit('disconnected');
          } else {
            const delay = isUnknownError ? 10000 : 3000;
            console.log(`[whatsapp] will reconnect in ${delay / 1000}s...`);
            this.reconnecting = true;
            setTimeout(() => {
              this.reconnecting = false;
              this.connect();
            }, delay);
          }
        }
      });
    } catch (err) {
      console.error('[whatsapp] connect() error:', err);
      this._connecting = false;
    }
  }

  async sendMessage(phone: string, text: string): Promise<boolean> {
    if (!this.sock || !this._connected) {
      console.warn('[whatsapp] sendMessage skipped — not connected');
      return false;
    }
    try {
      const digits = phone.replace(/\D/g, '');
      const jid = digits + '@s.whatsapp.net';
      console.log(`[whatsapp] sendMessage — raw: "${phone}", digits: "${digits}", jid: "${jid}"`);
      const result = await this.sock.sendMessage(jid, { text });
      console.log(`[whatsapp] sendMessage OK — messageId: ${result?.key?.id}`);
      return true;
    } catch (err) {
      console.error('[whatsapp] send error:', err);
      return false;
    }
  }

  async logout() {
    try {
      await this.sock?.logout();
    } catch {}
    this.sock = null;
    this._connected = false;
    this._phone = null;
    this._qr = null;
    this.consecutiveFailures = 0;
    this.clearAuthState();
    this.emit('disconnected');
  }

  private clearAuthState() {
    try {
      if (fs.existsSync(AUTH_DIR)) {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        console.log('[whatsapp] auth state cleared');
      }
    } catch (err) {
      console.error('[whatsapp] failed to clear auth state:', err);
    }
  }
}

export const waClient = new WhatsAppClient();
