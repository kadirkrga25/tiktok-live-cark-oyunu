import 'dotenv/config';
import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { TikTokLiveClient, EventType, ProfileCache } from 'piratetok-live-js';
// Legacy connector is used ONLY to fetch TikTok's full gift catalogue; live events stay on free PirateTok.
import * as legacyTlc from 'tiktok-live-connector-legacy';
import { POPULAR_TIKTOK_GIFTS } from './src/utils/gifts.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.NODE_ENV === 'production' && process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Lightweight health/keep-alive endpoint. Browser clients call this periodically
// while the control/OBS page is open so Render receives real inbound traffic.
app.get('/api/keepalive', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.status(200).json({ ok: true, service: 'carkix', timestamp: Date.now() });
});

// Render HTTP health-check endpoint (configure Health Check Path as /healthz).
app.get('/healthz', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ ok: true });
});

// Full catalogue endpoint. This uses the legacy connector's direct getAvailableGifts()
// API for catalogue retrieval only; PirateTok remains the live event connection.
app.get('/api/tiktok-gifts', async (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const LegacyConnection = (legacyTlc as any).WebcastPushConnection
      || (legacyTlc as any).default?.WebcastPushConnection
      || (legacyTlc as any).default;
    if (typeof LegacyConnection !== 'function') {
      throw new Error('Hediye kataloğu istemcisi yüklenemedi.');
    }

    const catalogClient = new LegacyConnection(currentTikTokUsername || 'tiktok', {
      enableExtendedGiftInfo: true,
      requestOptions: { timeout: 15000 },
    });
    const rawResult = await catalogClient.getAvailableGifts();
    const rawGifts = Array.isArray(rawResult) ? rawResult
      : Array.isArray(rawResult?.gifts) ? rawResult.gifts
      : Array.isArray(rawResult?.data?.gifts) ? rawResult.data.gifts : [];

    const gifts = rawGifts.map((g: any) => {
      const image = g?.image || g?.icon || g?.gift_image || g?.giftImage || {};
      const imageUrl = g?.imageUrl || g?.image_url || g?.iconUrl || g?.icon_url
        || image?.url_list?.[0] || image?.urlList?.[0] || image?.urls?.[0]
        || (typeof image === 'string' ? image : '') || image?.uri || '';
      const id = g?.gift_id ?? g?.giftId ?? g?.id;
      const name = g?.name || g?.gift_name || g?.giftName || g?.describe || '';
      const diamondValue = Number(g?.diamond_count ?? g?.diamondCount ?? g?.diamond_value ?? g?.coins ?? g?.cost ?? 0);
      if (id == null || !name) return null;
      return { id: String(id), name: String(name), diamondValue, imageUrl: String(imageUrl || '') };
    }).filter(Boolean) as Array<{ id: string; name: string; diamondValue: number; imageUrl: string }>;

    if (!gifts.length) throw new Error('TikTok hediye kataloğu boş yanıt verdi.');
    cachedGiftCatalog = gifts;
    res.json({
      ok: true,
      source: 'tiktok-live-connector-legacy-getAvailableGifts',
      message: `TikTok hediye kataloğundan ${gifts.length} hediye çekildi.`,
      gifts,
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[TikTok Gift Catalog Error]:', err);
    res.status(502).json({
      error: `TikTok hediye kataloğu alınamadı: ${detail}`,
      hint: 'Canlı yayın bağlantısı PirateTok üzerinden çalışmaya devam eder; hata sadece katalog isteğine aittir.',
    });
  }
});

// Standard gift catalog
export const STANDARD_TIKTOK_GIFTS = [
  { id: '5655', name: 'Gül (Rose)', diamondValue: 1, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.image' },
  { id: '6037', name: 'Beni Sev (Heart Me)', diamondValue: 1, imageUrl: 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/heart_me.png~tplv-obj.image' },
];

// PirateTok ücretsiz olarak canlı etkinlikleri sağlar; tüm hediye kataloğu için ayrı bir ücretsiz API sunmaz.
// Bu nedenle yaygın hediyelerle başlarız ve yayında yeni bir hediye görülürse kataloğa ekleriz.
const POPULAR_GIFT_CATALOG = POPULAR_TIKTOK_GIFTS.map((gift) => ({
  id: String(gift.id),
  name: gift.turkishName ? `${gift.turkishName} (${gift.name})` : gift.name,
  diamondValue: Number(gift.coins) || 1,
  imageUrl: '',
}));
let cachedGiftCatalog = Array.from(
  new Map([...STANDARD_TIKTOK_GIFTS, ...POPULAR_GIFT_CATALOG].map((gift) => [String(gift.id), gift])).values()
);
let activeTikTokConnection: any = null;
let currentTikTokUsername = '';
let connectionStartTime = 0;

const profileCache = new ProfileCache({ ttlMs: 300_000 });
const profileAvatarPromises = new Map<string, Promise<string>>();

function extractAvatar(userObj: Record<string, unknown> | null | undefined): string {
  if (!userObj) return '';
  // PirateTok payloads can wrap the actual profile fields in user/userInfo/profile
  // and avatar objects may contain thumb/medium/large url-list variants.
  const queue: Array<{ value: any; depth: number }> = [{ value: userObj, depth: 0 }];
  const seen = new Set<any>();
  const isHttpUrl = (value: unknown): value is string =>
    typeof value === 'string' && /^https?:\/\//i.test(value.trim());

  while (queue.length) {
    const { value, depth } = queue.shift()!;
    if (!value || typeof value !== 'object' || seen.has(value) || depth > 5) continue;
    seen.add(value);

    // Prefer avatar/profile-picture fields rather than unrelated URLs in the payload.
    for (const key of ['avatarLarger', 'avatar_larger', 'avatarMedium', 'avatar_medium', 'avatarThumb', 'avatar_thumb', 'avatarLargerUrl', 'avatarMediumUrl', 'avatarThumbUrl', 'profilePictureUrl', 'profile_picture_url', 'profilePicUrl', 'profile_pic_url', 'avatarUrl', 'avatar_url', 'avatar', 'urlList', 'url_list', 'avatarUrlList', 'avatar_url_list', 'urls']) {
      const candidate = value[key];
      if (isHttpUrl(candidate)) return candidate.trim();
      if (typeof candidate === 'string' && candidate.trim().startsWith('//')) return `https:${candidate.trim()}`;
      if (Array.isArray(candidate)) {
        const found = candidate.find((item) => isHttpUrl(item) || (typeof item === 'string' && item.trim().startsWith('//')));
        if (found) return String(found).trim().startsWith('//') ? `https:${String(found).trim()}` : String(found).trim();
      }
    }
    for (const key of ['url', 'uri']) {
      if (isHttpUrl(value[key])) return value[key].trim();
      if (typeof value[key] === 'string' && value[key].trim().startsWith('//')) return `https:${value[key].trim()}`;
    }
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object' && /avatar|profile|picture|thumb|medium|large|user|image/i.test(key)) {
        queue.push({ value: child, depth: depth + 1 });
      }
    }
  }
  return '';
}

/** Get the real TikTok avatar from the event payload first, then resolve it from the public profile. */
async function resolveRealAvatar(userObj: Record<string, unknown> | null | undefined, username: string): Promise<string> {
  const inlineAvatar = extractAvatar(userObj);
  if (inlineAvatar) return inlineAvatar;
  const cleanUsername = String(username || '').replace(/^@/, '').trim();
  if (!cleanUsername) return '';
  const cacheKey = cleanUsername.toLowerCase();
  let lookup = profileAvatarPromises.get(cacheKey);
  if (!lookup) {
    lookup = profileCache.fetch(cleanUsername)
      .then((profile: any) => {
        const avatar = extractAvatar(profile as Record<string, unknown>);
        if (!avatar) profileAvatarPromises.delete(cacheKey); // Retry on a later event if TikTok temporarily returned no avatar.
        return avatar;
      })
      .catch((error: unknown) => {
        profileAvatarPromises.delete(cacheKey);
        console.warn(`[TikTok Avatar] Profil fotoğrafı alınamadı (@${cleanUsername}):`, error instanceof Error ? error.message : error);
        return '';
      });
    profileAvatarPromises.set(cacheKey, lookup);
  }
  return lookup;
}

async function connectTikTokStream(rawUsername: string): Promise<{ ok: boolean; roomId?: string; error?: string }> {
  const clean = rawUsername.replace(/^@/, '').trim();
  if (!clean) return { ok: false, error: 'Kullanıcı adı belirtilmedi.' };

  if (activeTikTokConnection) {
    try { activeTikTokConnection.disconnect(); } catch {}
    activeTikTokConnection = null;
  }

  currentTikTokUsername = clean;
  broadcastToClients({ type: 'status_change', status: 'connecting_tiktok', username: clean });

  try {
    // PirateTok connects directly to TikTok's public LIVE WebSocket without Euler Stream.
    const connection = new TikTokLiveClient(clean);
    const lastLikeTotals = new Map<string, number>();

    connection.on(EventType.follow, async (data: any) => {
      const user = data?.user || data?.userInfo || data?.user_info || data?.profile || data;
      const username = user?.uniqueId || user?.unique_id || user?.username || user?.uniqueID || '';
      if (!username) return;
      broadcastToClients({
        type: 'follow',
        username,
        displayName: user?.nickname || user?.displayName || username,
        avatar: await resolveRealAvatar(user, username),
      });
    });

    connection.on(EventType.like, async (data: any) => {
      const user = data?.user || data?.userInfo || data?.user_info || data?.profile || {};
      const username = user?.uniqueId || user?.unique_id || user?.username || user?.uniqueID || '';
      if (!username) return;
      const displayName = user?.nickname || user?.displayName || username;
      const rawCount = Number(data?.count ?? data?.likeCount ?? data?.like_count ?? 0);
      const total = Number(data?.total ?? data?.totalLikeCount ?? data?.total_like_count ?? 0);
      let likeCount = rawCount;
      if (!(likeCount > 0) && total > 0) {
        const previous = lastLikeTotals.get(username) ?? 0;
        likeCount = Math.max(0, total - previous);
        if (likeCount === 0 && previous === 0) likeCount = total;
      }
      if (!(likeCount > 0)) likeCount = 1;
      if (total > 0) lastLikeTotals.set(username, Math.max(total, lastLikeTotals.get(username) ?? 0));
      broadcastToClients({
        type: 'like',
        username,
        displayName,
        avatar: await resolveRealAvatar(user, username),
        likeCount,
        totalLikeCount: total || undefined,
      });
    });

    connection.on(EventType.gift, async (data: any) => {
      const user = data?.user || data?.userInfo || data?.user_info || data?.profile || {};
      const username = user?.uniqueId || user?.unique_id || user?.username || user?.uniqueID || '';
      if (!username) return;
      const gift = data?.gift || {};
      const giftId = String(data?.giftId ?? data?.gift_id ?? gift?.id ?? '');
      const giftName = String(gift?.name || data?.giftName || data?.gift_name || 'TikTok hediyesi');
      const diamondValue = Number(gift?.diamondCount ?? gift?.diamond_count ?? data?.diamondCount ?? data?.diamond_count ?? 0);
      const giftImage = gift?.imageUrl || gift?.image_url || gift?.image?.urlList?.[0] || gift?.image?.url_list?.[0] || '';
      if (giftId && !cachedGiftCatalog.some((item: any) => String(item.id) === giftId)) {
        cachedGiftCatalog.push({ id: giftId, name: giftName, diamondValue, imageUrl: giftImage });
      }
      broadcastToClients({
        type: 'gift',
        username,
        displayName: user?.nickname || user?.displayName || username,
        avatar: await resolveRealAvatar(user, username),
        giftId,
        giftName,
        giftCount: Number(data?.repeatCount ?? data?.repeat_count ?? data?.count ?? 1) || 1,
        diamondCount: diamondValue,
        repeatEnd: Boolean(data?.isFinal ?? data?.repeatEnd ?? data?.repeat_end ?? true),
      });
    });

    connection.on('reconnecting' as any, (data: any) => {
      console.warn('[PirateTok] Yeniden bağlanıyor:', data || '');
      broadcastToClients({ type: 'status_change', status: 'connecting_tiktok', username: clean });
    });

    connection.on('disconnected' as any, (data: any) => {
      console.warn('[PirateTok] Bağlantı kesildi:', data || '');
      if (activeTikTokConnection === connection) {
        broadcastToClients({ type: 'status_change', status: 'error', error: 'TikTok bağlantısı kesildi. Yayının hâlâ açık olduğunu kontrol edip yeniden bağlan.' });
      }
    });

    activeTikTokConnection = connection;
    const roomId = await connection.connect();
    connectionStartTime = Date.now();
    broadcastToClients({ type: 'status_change', status: 'connected_live', username: clean, roomId: String(roomId || '') });
    return { ok: true, roomId: String(roomId || '') };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[PirateTok Connection Failed]:', err);
    activeTikTokConnection = null;
    const userMessage = `Bağlantı kurulamadı: ${message}. Kullanıcının yayında olduğunu ve kullanıcı adının doğru yazıldığını kontrol et.`;
    broadcastToClients({ type: 'status_change', status: 'error', error: userMessage });
    return { ok: false, error: userMessage };
  }
}

function disconnectTikTokStream() {
  if (activeTikTokConnection) {
    try { activeTikTokConnection.disconnect(); } catch {}
    activeTikTokConnection = null;
  }
  currentTikTokUsername = '';
  broadcastToClients({ type: 'status_change', status: 'disconnected' });
}

// REST & WS Setup
const wss = new WebSocketServer({ noServer: true });
const sseClients = new Set<Response>();

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host || 'localhost'}`).pathname;
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
  } else {
    socket.destroy();
  }
});

function broadcastToClients(data: Record<string, unknown>) {
  const jsonStr = JSON.stringify(data);
  wss.clients.forEach((c) => { if (c.readyState === WebSocket.OPEN) c.send(jsonStr); });
  sseClients.forEach((res) => res.write(`data: ${jsonStr}\n\n`));
}

app.post('/api/tiktok/connect', async (req: Request, res: Response) => {
  const { username } = req.body || {};
  res.json(await connectTikTokStream(String(username || '')));
});

app.post('/api/tiktok/disconnect', (_req: Request, res: Response) => {
  disconnectTikTokStream();
  res.json({ ok: true });
});

app.get('/api/tiktok/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  sseClients.add(res);
  req.on('close', () => sseClients.delete(res));
});

wss.on('connection', (ws: WebSocket) => {
  ws.on('message', async (raw) => {
    const msg = JSON.parse(raw.toString());
    if (msg.action === 'connect') await connectTikTokStream(msg.username);
    else if (msg.action === 'disconnect') disconnectTikTokStream();
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => res.sendFile(path.join(__dirname, 'dist', 'index.html')));
  }
  server.on('error', (e: any) => {
    if (e.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is in use, attempting to proceed...`);
    } else {
      console.error('Server error:', e);
    }
  });
  server.listen(PORT, () => console.log(`Sunucu aktif: http://localhost:${PORT}`));
}

startServer();
