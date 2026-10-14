import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import QRCode from 'qrcode';
import { waClient } from './wa-client';

const app = express();
app.use(express.json());

const PORT = parseInt(process.env.PORT || '3001', 10);
const TOKEN = process.env.WA_INTERNAL_TOKEN || '';

function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!TOKEN) return next();
  const header = req.headers.authorization;
  if (header !== `Bearer ${TOKEN}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

app.use(authMiddleware);

app.get('/status', (_req, res) => {
  res.json(waClient.status);
});

app.get('/debug', (_req, res) => {
  res.json(waClient.debugState);
});

app.get('/test-net', async (_req, res) => {
  const results: Record<string, any> = {};

  const targets = [
    { name: 'google', url: 'https://www.google.com' },
    { name: 'whatsapp_web', url: 'https://web.whatsapp.com' },
  ];
  for (const t of targets) {
    try {
      const start = Date.now();
      const r = await fetch(t.url, { signal: AbortSignal.timeout(5000) });
      results[t.name] = { status: r.status, ok: r.ok, ms: Date.now() - start };
    } catch (err: any) {
      results[t.name] = { error: err.message || String(err) };
    }
  }

  // Raw WebSocket test to WhatsApp
  results['ws_test'] = await new Promise((resolve) => {
    const testWs = new WebSocket('wss://web.whatsapp.com/ws/chat', undefined, {
      headers: {
        Origin: 'https://web.whatsapp.com',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
    });
    const timer = setTimeout(() => {
      testWs.close();
      resolve({ error: 'timeout 5s' });
    }, 5000);
    testWs.on('open', () => {
      clearTimeout(timer);
      testWs.close();
      resolve({ connected: true });
    });
    testWs.on('error', (err: Error) => {
      clearTimeout(timer);
      resolve({ error: err.message });
    });
    testWs.on('unexpected-response', (_req: any, wsRes: any) => {
      clearTimeout(timer);
      resolve({ error: `unexpected-response`, status: wsRes.statusCode, headers: wsRes.headers });
    });
  });

  results['node_version'] = process.version;

  res.json(results);
});

app.post('/send', async (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'missing to or message' });
  }
  console.log(`[whatsapp] /send request — to: "${to}", connected: ${waClient.status.connected}, msgLen: ${message.length}`);
  const ok = await waClient.sendMessage(to, message);
  console.log(`[whatsapp] /send result — to: "${to}", ok: ${ok}`);
  res.json({ ok });
});

app.post('/logout', async (_req, res) => {
  await waClient.logout();
  res.json({ ok: true });
});

app.get('/qr-data', async (_req, res) => {
  if (waClient.status.connected) {
    return res.json({ type: 'connected', phone: waClient.status.phone });
  }
  if (waClient.currentQr) {
    const qrDataUrl = await QRCode.toDataURL(waClient.currentQr);
    return res.json({ type: 'qr', data: qrDataUrl });
  }
  waClient.ensureConnecting();
  res.json({ type: 'waiting' });
});

const server = http.createServer(app);

// WebSocket for QR streaming
const wss = new WebSocketServer({ server, path: '/qr' });

wss.on('connection', async (ws: WebSocket, req) => {
  // Auth check for WebSocket
  if (TOKEN) {
    const url = new URL(req.url || '/', `http://localhost:${PORT}`);
    if (url.searchParams.get('token') !== TOKEN) {
      ws.close(1008, 'unauthorized');
      return;
    }
  }

  // Send current state
  if (waClient.status.connected) {
    ws.send(JSON.stringify({ type: 'connected', phone: waClient.status.phone }));
  } else if (waClient.currentQr) {
    const qrDataUrl = await QRCode.toDataURL(waClient.currentQr);
    ws.send(JSON.stringify({ type: 'qr', data: qrDataUrl }));
  }

  const onQr = async (qr: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      const qrDataUrl = await QRCode.toDataURL(qr);
      ws.send(JSON.stringify({ type: 'qr', data: qrDataUrl }));
    }
  };

  const onConnected = (phone: string) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'connected', phone }));
    }
  };

  const onDisconnected = () => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'disconnected' }));
    }
  };

  waClient.on('qr', onQr);
  waClient.on('connected', onConnected);
  waClient.on('disconnected', onDisconnected);

  ws.on('close', () => {
    waClient.off('qr', onQr);
    waClient.off('connected', onConnected);
    waClient.off('disconnected', onDisconnected);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[whatsapp] listening on :${PORT}`);
  waClient.connect();
});
