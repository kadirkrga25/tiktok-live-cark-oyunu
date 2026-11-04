import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Participant,
  WinRecord,
  FeedEvent,
  GameSettings,
  TikTokStatusState,
  GiftRule,
  BigGiftAlertData,
} from './types';
import { OFFICIAL_TIKTOK_GIFTS, matchGiftRule } from './utils/tiktokGifts';
import { soundEngine } from './utils/audio';
import { getFallbackAvatar } from './utils/avatars';
import { BroadcastLayout } from './components/BroadcastLayout';
import { ControlPanel } from './components/ControlPanel';
import { BigGiftAlert } from './components/BigGiftAlert';
import confetti from 'canvas-confetti';
import { Tv, Sliders, Radio } from 'lucide-react';

const VIBRANT_COLORS = [
  '#fe2c55', '#25f4ee', '#ffd700', '#00f5a0', '#a855f7',
  '#ff9500', '#ec4899', '#14b8a6', '#f97316', '#3b82f6',
  '#84cc16', '#06b6d4', '#e11d48', '#8b5cf6', '#10b981',
];

const INITIAL_SETTINGS: GameSettings = {
  prizeName: '100 Jeton Büyük Ödül',
  wheelCapacity: 200,
  maxPercentPerUser: 10, // Max %10 of total capacity
  maxRightsPerUser: 0, // 0 = use percentage limit, or fixed number (e.g. 5, 10, 20)

  followEnabled: true,
  followRights: 2,
  repeatFollowAllowed: false,

  likeEnabled: true,
  likeThresholdPerUser: 500, // Strictly 500 likes per person!
  likeRightsPerThreshold: 1,
  allowThresholdMultipliers: true,

  giftEnabled: true,
  giftRules: OFFICIAL_TIKTOK_GIFTS,
  defaultCoinThreshold: 100,

  winProtection: true,
  eliminationMode: 'lose_one_right',
  autoSpinEnabled: false,
  autoSpinIntervalSec: 15,

  soundEnabled: true,
  masterVolume: 70,
  spinVolume: 65,
  winVolume: 80,
  customSpinUrl: '',
  customWinUrl: '',

  showMarqueeNotifications: true,
  marqueeSpeedSec: 15,
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    try {
      const saved = localStorage.getItem('tiktok_wheel_settings');
      return saved ? { ...INITIAL_SETTINGS, ...JSON.parse(saved), autoSpinEnabled: false } : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roundParticipants, setRoundParticipants] = useState<Participant[]>([]);
  const [winners, setWinners] = useState<WinRecord[]>(() => {
    try {
      const saved = localStorage.getItem('tiktok_wheel_winners');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [feedEvents, setFeedEvents] = useState<FeedEvent[]>([]);
  const [viewMode, setViewMode] = useState<'broadcast' | 'control'>('control');
  const [enrollOpen, setEnrollOpen] = useState(true);
  // Katılım, ilk dönüşten kazanan ilan edilene kadar kapalı kalır.
  const [roundInProgress, setRoundInProgress] = useState(false);
  const roundInProgressRef = useRef(false);

  // Big Gift Alert State (100+ jeton alert: kesene bereketler olsun)
  const [bigGiftAlert, setBigGiftAlert] = useState<BigGiftAlertData | null>(null);
  const [specialBonus, setSpecialBonus] = useState<{
    id: string; username: string; displayName: string; avatar: string; giftName: string; rights: number;
  } | null>(null);

  // Auto-Spin Countdown State
  const [autoSpinCountdown, setAutoSpinCountdown] = useState<number>(settings.autoSpinIntervalSec || 15);

  // Wheel State
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinLocked, setSpinLocked] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [targetAngle, setTargetAngle] = useState(0);
  const [lastRoundWinner, setLastRoundWinner] = useState<Participant | null>(null);

  // TikTok Live WebSocket State
  const [tikTokStatus, setTikTokStatus] = useState<TikTokStatusState>({
    status: 'server_ready',
    username: '',
    uptimeSeconds: 0,
    eventsCount: { follows: 0, likes: 0, gifts: 0 },
  });

  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectTimerRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const demoIntervalRef = useRef<number | null>(null);

  // Real-time synchronization refs to completely prevent closure lag during spin
  const isSpinningRef = useRef(false);
  const spinLockedRef = useRef(false);
  const enrollOpenRef = useRef(true);
  const settingsRef = useRef(settings);

  // Keep the Render free web service warm while this app (including OBS mode)
  // is open. This is a real browser -> Render request, not a localhost self-ping.
  // Ten minutes stays below Render Free's 15-minute idle window.
  useEffect(() => {
    let active = true;
    const ping = () => {
      if (!active) return;
      fetch('/api/keepalive', { method: 'GET', cache: 'no-store', keepalive: true })
        .catch(() => { /* transient network errors are harmless; next ping retries */ });
    };
    ping();
    const intervalId = window.setInterval(ping, 10 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    isSpinningRef.current = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    spinLockedRef.current = spinLocked;
  }, [spinLocked]);

  useEffect(() => {
    enrollOpenRef.current = enrollOpen;
  }, [enrollOpen]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Persist settings & winners
  useEffect(() => {
    try {
      localStorage.setItem('tiktok_wheel_settings', JSON.stringify(settings));
    } catch {}
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem('tiktok_wheel_winners', JSON.stringify(winners));
    } catch {}
  }, [winners]);

  // Fullscreen mode state
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Check URL query parameters for OBS mode: ?mode=obs or ?mode=public
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode');
      if (mode === 'obs' || mode === 'public' || mode === 'stream') {
        setViewMode('broadcast');
      }
    }
  }, []);

  // Add Feed Event helper
  const addFeedItem = useCallback((event: Omit<FeedEvent, 'id' | 'timestamp'>) => {
    const newEvent: FeedEvent = {
      ...event,
      id: Math.random().toString(36).substring(2, 9),
      timestamp: Date.now(),
    };
    setFeedEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
  }, []);

  // Add Rights to Participant (Strict Per-Person Logic & Limits)
  const addRightsToParticipant = useCallback(
    (
      username: string,
      displayName: string,
      avatar: string,
      rightsToAdd: number,
      source: 'follow' | 'like' | 'gift',
      extraDesc?: string
    ) => {
      if (rightsToAdd <= 0) return;

      const safeAvatar = avatar || getFallbackAvatar(username);

      // İlk dönüş başladığında katılım kazanan belirlenene kadar kilitlenir.
      // Kilitliyken gelen yorum/hediye/takip yeni katılımcı veya hak oluşturmaz.
      if (roundInProgressRef.current || roundInProgress || isSpinningRef.current || spinLockedRef.current || !enrollOpenRef.current) {
        addFeedItem({
          type: 'system',
          username: displayName || username,
          text: '🔒 Katılım kapalı — kazanan belirlenene kadar yeni hak eklenmedi.',
          subtext: extraDesc,
          avatar: safeAvatar,
        });
        return;
      }

      const currentSettings = settingsRef.current;

      setParticipants((prev) => {
        const activeTickets = prev.filter((p) => !p.isEliminated).reduce((s, p) => s + p.rights, 0);
        const spaceRemaining = Math.max(0, currentSettings.wheelCapacity - activeTickets);

        if (spaceRemaining <= 0) {
          addFeedItem({
            type: 'system',
            text: `Çark kapasitesi dolu (${currentSettings.wheelCapacity} hak)!`,
            username,
            avatar: safeAvatar,
          });
          return prev;
        }

        // KULLANICI TALEBİ: "hak kısıtlamaları var bak onu dikkate almıyor onu düzelt"
        // 1) maxRightsPerUser (Kişi başı sabit sayı sınırı)
        // 2) maxPercentPerUser (Kişi başı yüzdelik sınır)
        let maxAllowed = Infinity;
        if (currentSettings.maxRightsPerUser && currentSettings.maxRightsPerUser > 0) {
          maxAllowed = Math.min(maxAllowed, currentSettings.maxRightsPerUser);
        }
        if (currentSettings.maxPercentPerUser && currentSettings.maxPercentPerUser > 0) {
          const pctLimit = Math.max(1, Math.floor(currentSettings.wheelCapacity * (currentSettings.maxPercentPerUser / 100)));
          maxAllowed = Math.min(maxAllowed, pctLimit);
        }

        const existingIdx = prev.findIndex((p) => p.username.toLowerCase() === username.toLowerCase());

        if (existingIdx !== -1) {
          const current = prev[existingIdx];
          if (current.isEliminated) return prev;

          // Takip kuralı: Tekrar takibe izin yoksa ve kullanıcı zaten takip ettiyse hak verme!
          if (source === 'follow' && !currentSettings.repeatFollowAllowed && current.followed) {
            addFeedItem({
              type: 'system',
              text: `${displayName || username} zaten takip ettiği için tekrar hak verilmedi.`,
              avatar: safeAvatar,
            });
            return prev;
          }

          // Kullanıcı zaten maksimum hakkına ulaşmışsa ekleme yapma!
          if (current.rights >= maxAllowed) {
            addFeedItem({
              type: 'system',
              text: `${displayName || username} kişi başı hak sınırına (${maxAllowed} hak) ulaştı!`,
              avatar: safeAvatar,
            });
            return prev;
          }

          // Hem kişi başı hak sınırını hem de çark kalan kapasitesini tam uygula
          let effectiveAdding = Math.min(rightsToAdd, maxAllowed - current.rights, spaceRemaining);
          if (effectiveAdding <= 0) return prev;

          const updated = [...prev];
          updated[existingIdx] = {
            ...current,
            displayName: displayName || current.displayName,
            avatar: avatar || current.avatar || safeAvatar,
            rights: current.rights + effectiveAdding,
            earnedTotal: current.earnedTotal + effectiveAdding,
            followed: source === 'follow' ? true : current.followed,
          };

          addFeedItem({
            type: source,
            username: displayName || username,
            text: `+${effectiveAdding} Çark Hakkı kazandı (${updated[existingIdx].rights}/${maxAllowed !== Infinity ? maxAllowed : '∞'} Hak)`,
            subtext: extraDesc ? `${extraDesc}${effectiveAdding < rightsToAdd ? ` (Sınır nedeniyle +${effectiveAdding})` : ''}` : undefined,
            avatar: safeAvatar,
          });

          return updated;
        } else {
          // Yeni katılımcı - sınır ve kapasiteyi uygula
          let effectiveAdding = Math.min(rightsToAdd, maxAllowed, spaceRemaining);
          if (effectiveAdding <= 0) return prev;

          const color = VIBRANT_COLORS[prev.length % VIBRANT_COLORS.length];
          const newParticipant: Participant = {
            id: username,
            username,
            displayName: displayName || username,
            avatar: safeAvatar,
            rights: effectiveAdding,
            earnedTotal: effectiveAdding,
            likesAccumulated: 0,
            thresholdsCompleted: 0,
            followed: source === 'follow',
            isEliminated: false,
            color,
            joinedAt: Date.now(),
          };

          addFeedItem({
            type: source,
            username: displayName || username,
            text: `+${effectiveAdding} Çark Hakkı kazandı (${effectiveAdding}/${maxAllowed !== Infinity ? maxAllowed : '∞'} Hak)`,
            subtext: extraDesc ? `${extraDesc}${effectiveAdding < rightsToAdd ? ` (Sınır nedeniyle +${effectiveAdding})` : ''}` : undefined,
            avatar: safeAvatar,
          });

          return [...prev, newParticipant];
        }
      });
    },
    [addFeedItem, roundInProgress]
  );

  // Per-Person Like Processor (Strictly per-person accumulator with limit enforcement)
  const processPersonLikes = useCallback(
    (username: string, displayName: string, avatar: string, batchLikes: number) => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.likeEnabled) return;
      if (roundInProgress || !enrollOpenRef.current) return;

      setParticipants((prev) => {
        const existingIdx = prev.findIndex((p) => p.username.toLowerCase() === username.toLowerCase());
        const threshold = currentSettings.likeThresholdPerUser;
        let p: Participant;

        if (existingIdx !== -1) {
          p = { ...prev[existingIdx] };
        } else {
          p = {
            id: username,
            username,
            displayName: displayName || username,
            avatar: avatar || getFallbackAvatar(username),
            rights: 0,
            earnedTotal: 0,
            likesAccumulated: 0,
            thresholdsCompleted: 0,
            followed: false,
            isEliminated: false,
            color: VIBRANT_COLORS[prev.length % VIBRANT_COLORS.length],
            joinedAt: Date.now(),
          };
        }

        // Add this specific batch to user's personal accumulator
        p.likesAccumulated += batchLikes;

        // Calculate thresholds achieved
        const totalThresholdsCrossed = Math.floor(p.likesAccumulated / threshold);
        const newThresholds = totalThresholdsCrossed - p.thresholdsCompleted;

        if (newThresholds > 0) {
          const rightsWon = currentSettings.allowThresholdMultipliers
            ? newThresholds * currentSettings.likeRightsPerThreshold
            : currentSettings.likeRightsPerThreshold;

          p.thresholdsCompleted = totalThresholdsCrossed;

          // Kazanılan hakları merkezi sınırlama ve kilit mekanizmasına aktar
          setTimeout(() => {
            addRightsToParticipant(
              username,
              displayName,
              p.avatar || avatar || getFallbackAvatar(username),
              rightsWon,
              'like',
              `${p.likesAccumulated.toLocaleString('tr')} beğeni`
            );
          }, 0);
        }

        if (existingIdx !== -1) {
          const copy = [...prev];
          copy[existingIdx] = p;
          return copy;
        } else {
          return [...prev, p];
        }
      });
    },
    [addRightsToParticipant, roundInProgress]
  );

  // Connect to WebSocket Server for TikTok Live Events
  const connectToWebSocketServer = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;
    if (wsReconnectTimerRef.current !== null) {
      window.clearTimeout(wsReconnectTimerRef.current);
      wsReconnectTimerRef.current = null;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setTikTokStatus((prev) => ({ ...prev, status: 'server_ready' }));
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          const type = msg.type;

          if (type === 'status_change') {
            setTikTokStatus((prev) => ({
              ...prev,
              status: msg.status,
              username: msg.username || prev.username,
              roomId: msg.roomId || prev.roomId,
              lastError: msg.error || undefined,
            }));
          } else if (type === 'follow') {
            setTikTokStatus((prev) => ({
              ...prev,
              status: 'receiving_events',
              eventsCount: { ...prev.eventsCount, follows: prev.eventsCount.follows + 1 },
            }));

            const currentSettings = settingsRef.current;
            if (currentSettings.followEnabled) {
              addRightsToParticipant(msg.username, msg.displayName, msg.avatar, currentSettings.followRights, 'follow');
            }
          } else if (type === 'like') {
            setTikTokStatus((prev) => ({
              ...prev,
              status: 'receiving_events',
              eventsCount: { ...prev.eventsCount, likes: prev.eventsCount.likes + 1 },
            }));

            // Strictly per-person like accumulation!
            processPersonLikes(msg.username, msg.displayName, msg.avatar, Number(msg.likeCount || 1));
          } else if (type === 'gift') {
            setTikTokStatus((prev) => ({
              ...prev,
              status: 'receiving_events',
              eventsCount: { ...prev.eventsCount, gifts: prev.eventsCount.gifts + 1 },
            }));

            const currentSettings = settingsRef.current;
            if (currentSettings.giftEnabled) {
              const matchedRule = matchGiftRule(msg.giftId, msg.giftName, currentSettings.giftRules);
              const giftCount = Math.max(1, Number(msg.giftCount || 1));
              const diamondPerUnit = matchedRule ? matchedRule.diamondValue : Number(msg.diamondCount || 0);
              const totalDiamonds = diamondPerUnit * giftCount;

              // KULLANICI TALEBİ: 100 jeton üstü hediye geldiği zaman ama SADECE çark dönmüyorken
              // ekranda profil fotoğrafı çıksın gelsin büyüsün büyüsün kesene bereketler olsun yazsın
              if (totalDiamonds >= 100 && !isSpinningRef.current && !spinLockedRef.current) {
                setBigGiftAlert({
                  id: Math.random().toString(36).substring(2, 9),
                  username: msg.username || 'izleyici',
                  displayName: msg.displayName || msg.username || 'Değerli İzleyici',
                  avatar: msg.avatar || '',
                  giftName: matchedRule ? matchedRule.name : (msg.giftName || 'Hediye'),
                  giftImageUrl: matchedRule?.imageUrl,
                  diamonds: totalDiamonds,
                  giftCount,
                  timestamp: Date.now(),
                });

                if (currentSettings.soundEnabled) {
                  soundEngine.playBigGiftAlert(currentSettings.masterVolume / 100);
                }
              }

              if (matchedRule) {
                // If the streamer has turned OFF this gift, do not award rights!
                if (!matchedRule.enabled || matchedRule.action === 'disabled') {
                  addFeedItem({
                    type: 'gift',
                    username: msg.displayName || msg.username,
                    text: `${matchedRule.name} × ${giftCount} (Devre Dışı Hediye)`,
                    avatar: msg.avatar,
                  });
                  return;
                }

                if (matchedRule.action === 'instant_spin') {
                  // Hediye olayları tek başına çarkı başlatamaz. Çark yalnızca
                  // yayıncı manuel Çarkı Çevir veya Oto Çevir kontrolünü açınca döner.
                  addFeedItem({
                    type: 'gift',
                    username: msg.displayName || msg.username,
                    text: `${matchedRule.name} × ${giftCount} gönderdi — Çarkı yalnızca yayıncı başlatabilir.`,
                    avatar: msg.avatar,
                  });
                } else if (matchedRule.action === 'special_bonus') {
                  // Tur başladıktan sonra bonus hediyeleri bu turda kesinlikle işlenmez.
                  if (roundInProgressRef.current || roundInProgress) {
                    addFeedItem({
                      type: 'gift',
                      username: msg.displayName || msg.username,
                      text: `${matchedRule.name} gönderdi — Tur devam ettiği için özel bonus uygulanmadı.`,
                      avatar: msg.avatar,
                    });
                    return;
                  }
                  // Özel bonus hediyesi: yalnızca tur dışında 1-8 arası rastgele hak verir.
                  const bonusRights = 1 + Math.floor(Math.random() * 8);
                  setSpecialBonus({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    username: msg.username || msg.uniqueId || 'izleyici',
                    displayName: msg.displayName || msg.username || 'İzleyici',
                    avatar: msg.avatar || '',
                    giftName: `${matchedRule.name}${giftCount > 1 ? ` × ${giftCount}` : ''}`,
                    rights: bonusRights,
                  });
                } else {
                  const rightsWon = (matchedRule.rights || 1) * giftCount;
                  addRightsToParticipant(
                    msg.username,
                    msg.displayName,
                    msg.avatar,
                    rightsWon,
                    'gift',
                    `${matchedRule.name} × ${giftCount}`
                  );
                }
              } else {
                // Unknown gift with diamond value
                if (totalDiamonds > 0) {
                  const threshold = currentSettings.defaultCoinThreshold || 100;
                  const rightsWon = Math.max(1, Math.floor(totalDiamonds / threshold));
                  addRightsToParticipant(
                    msg.username,
                    msg.displayName,
                    msg.avatar,
                    rightsWon,
                    'gift',
                    `${msg.giftName || 'Hediye'} (${totalDiamonds} Jeton)`
                  );
                }
              }
            }
          } else if (type === 'gifts_updated') {
            if (Array.isArray(msg.gifts)) {
              setSettings((prev) => ({
                ...prev,
                giftRules: msg.gifts.map((g: { id: string; name: string; diamondValue: number; imageUrl: string }) => {
                  const existing = prev.giftRules.find((r) => String(r.id) === String(g.id));
                  return {
                    id: String(g.id),
                    name: g.name,
                    diamondValue: g.diamondValue,
                    imageUrl: g.imageUrl,
                    enabled: existing ? existing.enabled : false, // Streamer chooses!
                    rights: existing ? existing.rights : Math.max(1, Math.floor(g.diamondValue / 100)),
                    action: existing ? existing.action : 'rights',
                  };
                }),
              }));
            }
          }
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };

      ws.onerror = () => {
        setTikTokStatus((prev) => ({
          ...prev,
          status: 'error',
          lastError: 'WebSocket sunucusuna bağlanılamadı.',
        }));
      };

      ws.onclose = () => {
        if (wsRef.current !== ws) return;
        wsRef.current = null;
        setTikTokStatus((prev) => ({ ...prev, status: 'disconnected' }));
        // Recover automatically if the local server restarts or OBS is opened during startup.
        wsReconnectTimerRef.current = window.setTimeout(() => {
          wsReconnectTimerRef.current = null;
          connectToWebSocketServer();
        }, 1500);
      };
    } catch {
      setTikTokStatus((prev) => ({ ...prev, status: 'server_offline' }));
    }
  }, [addRightsToParticipant, processPersonLikes, addFeedItem]);

  useEffect(() => {
    connectToWebSocketServer();
    return () => {
      if (wsReconnectTimerRef.current !== null) {
        window.clearTimeout(wsReconnectTimerRef.current);
        wsReconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null;
        // Prevent the intentional React StrictMode/dev cleanup from looking like a real outage.
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [connectToWebSocketServer]);

  // Connect to TikTok Live room via WS
  const handleConnectTikTok = (rawUsername: string) => {
    const clean = rawUsername.replace('@', '').trim();
    if (!clean) return;

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'connect', username: clean }));
      setTikTokStatus((prev) => ({
        ...prev,
        status: 'connecting_tiktok',
        username: clean,
        lastError: undefined,
      }));
    }
  };

  const handleDisconnectTikTok = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: 'disconnect' }));
    }
    if (demoIntervalRef.current) {
      clearInterval(demoIntervalRef.current);
      demoIntervalRef.current = null;
    }
    setTikTokStatus((prev) => ({ ...prev, status: 'disconnected' }));
  };

  // Demo Mode: generates realistic test events
  const handleStartDemoMode = () => {
    handleDisconnectTikTok();
    setTikTokStatus((prev) => ({
      ...prev,
      status: 'demo_active',
      username: 'demo_yayinci',
    }));

    const demoUsers = [
      { u: 'ahmet_stream', n: 'Ahmet', a: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop' },
      { u: 'zeynep_pro', n: 'Zeynep', a: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
      { u: 'burak_live', n: 'Burak', a: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop' },
      { u: 'elif_kaya', n: 'Elif', a: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop' },
      { u: 'can_demir', n: 'Can', a: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
    ];

    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);

    demoIntervalRef.current = window.setInterval(() => {
      const user = demoUsers[Math.floor(Math.random() * demoUsers.length)];
      const rand = Math.random();

      if (rand < 0.3) {
        addRightsToParticipant(user.u, user.n, user.a, settings.followRights, 'follow');
      } else if (rand < 0.7) {
        processPersonLikes(user.u, user.n, user.a, 250);
      } else {
        const gift = settings.giftRules[Math.floor(Math.random() * Math.min(settings.giftRules.length, 6))];
        addRightsToParticipant(user.u, user.n, user.a, gift?.rights || 1, 'gift', gift?.name);
      }
    }, 2800);
  };

  // Fetch Live Gifts from Webcast REST API
  const handleFetchGifts = async (): Promise<{ ok: boolean; message: string; count: number }> => {
    const res = await fetch('/api/tiktok-gifts');
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Hediye servisi yanıt vermedi.');
    }
    if (Array.isArray(data.gifts) && data.gifts.length > 0) {
      setSettings((prev) => ({
        ...prev,
        giftRules: data.gifts.map((g: { id: string; name: string; diamondValue: number; imageUrl: string }) => {
          const existing = prev.giftRules.find((r) => String(r.id) === String(g.id));
          return {
            id: String(g.id),
            name: g.name,
            diamondValue: g.diamondValue,
            imageUrl: g.imageUrl,
            enabled: existing ? existing.enabled : false, // Streamer chooses!
            rights: existing ? existing.rights : Math.max(1, Math.floor(g.diamondValue / 100)),
            action: existing ? existing.action : 'rights',
          };
        }),
      }));
      return { ok: true, message: data.message, count: data.gifts.length };
    }
    return { ok: false, message: 'Liste boş döndü.', count: 0 };
  };

  // Auto-spin uses refs so the timer never runs game actions inside a React state updater.
  // This avoids duplicate spins and React render/update loops.
  const spinActionRef = useRef<() => void>(() => {});
  const countdownRef = useRef(autoSpinCountdown);

  useEffect(() => {
    countdownRef.current = autoSpinCountdown;
  }, [autoSpinCountdown]);

  useEffect(() => {
    if (!settings.autoSpinEnabled || isSpinning || spinLocked || lastRoundWinner) return;

    const active = participants.some((p) => !p.isEliminated && p.rights > 0);
    if (!active) return;

    const intervalSeconds = Math.max(1, settings.autoSpinIntervalSec || 15);
    if (countdownRef.current <= 0) {
      countdownRef.current = intervalSeconds;
      setAutoSpinCountdown(intervalSeconds);
    }

    const timer = window.setInterval(() => {
      const next = countdownRef.current - 1;
      if (next <= 0) {
        countdownRef.current = intervalSeconds;
        setAutoSpinCountdown(intervalSeconds);
        spinActionRef.current();
      } else {
        countdownRef.current = next;
        setAutoSpinCountdown(next);
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [
    settings.autoSpinEnabled,
    settings.autoSpinIntervalSec,
    isSpinning,
    spinLocked,
    lastRoundWinner,
    participants,
  ]);

  // WHEEL SPINNING & MATHEMATICAL SYNCHRONIZATION (User Requirement #10)
  const handleSpinWheel = () => {
    const active = participants.filter((p) => !p.isEliminated && p.rights > 0);
    if (active.length === 0 || isSpinning || spinLocked || isSpinningRef.current || spinLockedRef.current) return;

    soundEngine.unlockAudio();

    // KULLANICI TALEBİ: Çark bir kere dönmeye başladığı an katılım tamamen kilitlenir!
    // Ref'leri hemen senkron olarak kilitliyoruz ki closure gecikmesi olmasın.
    isSpinningRef.current = true;
    spinLockedRef.current = true;
    enrollOpenRef.current = false;
    setRoundInProgress(true);
    roundInProgressRef.current = true;
    // Önceki turdan bekleyen bir bonus animasyonu varsa yeni tur başlarken temizle.
    setSpecialBonus(null);

    setIsSpinning(true);
    setSpinLocked(true);
    setEnrollOpen(false); // Close participation during spin!

    // Snapshot all participants who entered this round for the victory celebration screen
    if (roundParticipants.length < participants.length) {
      setRoundParticipants([...participants]);
    }

    if (active.length === 1) {
      setIsSpinning(false);
      isSpinningRef.current = false;
      soundEngine.stopSpinSound();
      awardWinner(active[0]);
      return;
    }

    // Sound start
    if (settings.soundEnabled) {
      soundEngine.startSpinSound(settings.customSpinUrl, settings.spinVolume / 100);
    }

    // Weighted random selection based on active rights
    const totalSlots = active.reduce((sum, p) => sum + p.rights, 0);
    const chosenTicket = Math.floor(Math.random() * totalSlots);

    let cumulative = 0;
    let chosenUser: Participant = active[0];
    let startSliceFraction = 0;
    let endSliceFraction = 1;

    for (let i = 0; i < active.length; i++) {
      const sliceSize = active[i].rights;
      if (chosenTicket >= cumulative && chosenTicket < cumulative + sliceSize) {
        chosenUser = active[i];
        startSliceFraction = cumulative / totalSlots;
        endSliceFraction = (cumulative + sliceSize) / totalSlots;
        break;
      }
      cumulative += sliceSize;
    }

    // Exact angular position: middle of chosen sector
    const midFraction = (startSliceFraction + endSliceFraction) / 2;
    const targetSectorOffset = midFraction * Math.PI * 2;

    // Minimum 7 to 10 full spins for suspense
    const extraRotations = (8 + Math.floor(Math.random() * 4)) * Math.PI * 2;

    // Pointer is located at -PI/2
    const finalAngle = currentAngle + extraRotations - (currentAngle % (Math.PI * 2)) - targetSectorOffset;
    setTargetAngle(finalAngle);

    const spinDuration = 4200 + Math.random() * 800; // ~4.5 to 5 seconds
    const startTime = performance.now();
    const initialAngle = currentAngle;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / spinDuration);

      // Quartic ease out
      const ease = 1 - Math.pow(1 - progress, 4);
      const angleNow = initialAngle + (finalAngle - initialAngle) * ease;
      setCurrentAngle(angleNow);

      if (settings.soundEnabled) {
        soundEngine.updateSpinSpeed(progress);
      }

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animateSpin);
      } else {
        // Spin finished
        setIsSpinning(false);
        isSpinningRef.current = false;
        soundEngine.stopSpinSound();
        if (settings.soundEnabled) {
          soundEngine.playWheelStop(settings.spinVolume / 100);
        }
        handleSpinResult(chosenUser);
      }
    };

    animFrameRef.current = requestAnimationFrame(animateSpin);
  };

  // Keep the latest spin callback available to the stable auto-spin timer.
  spinActionRef.current = handleSpinWheel;

  // Handle Wheel Result (Deduction of 1 ticket or elimination)
  const handleSpinResult = (chosenUser: Participant) => {
    setParticipants((prev) => {
      const idx = prev.findIndex((p) => p.id === chosenUser.id);
      if (idx === -1) return prev;

      const updated = [...prev];
      const target = { ...updated[idx] };

      target.rights = Math.max(0, target.rights - 1);

      if (target.rights <= 0) {
        target.isEliminated = true;
        if (settings.soundEnabled) {
          soundEngine.playEliminationChime(settings.masterVolume / 100);
        }
        addFeedItem({
          type: 'elim',
          username: target.displayName || target.username,
          text: 'Tüm haklarını kaybetti ve ELENDİ!',
          avatar: target.avatar,
        });
      } else {
        if (settings.soundEnabled) {
          soundEngine.playRightLost(settings.masterVolume / 100);
        }
        addFeedItem({
          type: 'spin',
          username: target.displayName || target.username,
          text: `1 hak kaybetti! (${target.rights} hakkı kaldı)`,
          avatar: target.avatar,
        });
      }

      updated[idx] = target;

      // Check if only 1 active participant remains
      const remaining = updated.filter((p) => !p.isEliminated && p.rights > 0);
      if (remaining.length === 1) {
        setTimeout(() => {
          awardWinner(remaining[0]);
        }, 600);
      } else {
        // Bir sonraki eleme dönüşüne izin ver; katılım kilidi kazanana kadar sürer.
        setSpinLocked(false);
        spinLockedRef.current = false;
        setEnrollOpen(false);
        enrollOpenRef.current = false;
        roundInProgressRef.current = true;
      }

      return updated;
    });
  };

  // Declare Winner & Award 1 WIN (User Requirement #7 & #10)
  const awardWinner = (winner: Participant) => {
    setLastRoundWinner(winner);
    setSpinLocked(true);

    // Confetti explosion
    try {
      confetti({
        particleCount: 140,
        spread: 90,
        origin: { y: 0.6 },
      });
    } catch {}

    // Victory sound
    if (settings.soundEnabled) {
      soundEngine.playVictoryFanfare(settings.customWinUrl, settings.winVolume / 100);
    }

    // Update WIN Leaderboard (Guaranteed no duplicate WIN assignment in same round)
    setWinners((prev) => {
      const idx = prev.findIndex((w) => w.username.toLowerCase() === winner.username.toLowerCase());
      if (idx !== -1) {
        const copy = [...prev];
        copy[idx] = {
          ...copy[idx],
          winCount: copy[idx].winCount + 1,
          lastWinTimestamp: Date.now(),
        };
        return copy;
      } else {
        const newRecord: WinRecord = {
          username: winner.username,
          displayName: winner.displayName || winner.username,
          avatar: winner.avatar,
          winCount: 1,
          lastWinTimestamp: Date.now(),
        };
        return [...prev, newRecord];
      }
    });

    addFeedItem({
      type: 'win',
      username: winner.displayName || winner.username,
      text: `🏆 BÜYÜK ÖDÜLÜ KAZANDI: ${settings.prizeName}!`,
      avatar: winner.avatar,
    });
  };

  // Winner modal actions: close, keep, and eliminate all update the game state.
  const closeWinnerAndResume = () => {
    setLastRoundWinner(null);
    setRoundInProgress(false);
    roundInProgressRef.current = false;
    setIsSpinning(false);
    setSpinLocked(false);
    isSpinningRef.current = false;
    spinLockedRef.current = false;
    setEnrollOpen(true);
    enrollOpenRef.current = true;
    setAutoSpinCountdown(settings.autoSpinIntervalSec || 15);
  };

  const handleEliminateWinner = (winnerId: string) => {
    const eliminated = lastRoundWinner;
    setParticipants((prev) =>
      prev.map((participant) =>
        participant.id === winnerId
          ? { ...participant, rights: 0, isEliminated: true }
          : participant
      )
    );
    addFeedItem({
      type: 'elim',
      username: eliminated?.displayName || eliminated?.username || 'Kazanan',
      text: 'Kazanan oyuncu çarktan çıkarıldı.',
      avatar: eliminated?.avatar || '',
    });
    closeWinnerAndResume();
  };

  const handleKeepWinner = () => {
    addFeedItem({
      type: 'system',
      username: lastRoundWinner?.displayName || lastRoundWinner?.username || 'Kazanan',
      text: 'Kazanan oyuncu çarkta tutuldu. Devam edilebilir.',
      avatar: lastRoundWinner?.avatar || '',
    });
    closeWinnerAndResume();
  };

  // Transition to Next Round
  const handleNextRound = () => {
    setLastRoundWinner(null);
    setRoundInProgress(false);
    roundInProgressRef.current = false;
    setParticipants([]); // Clear wheel participants for new round
    setRoundParticipants([]);
    setCurrentAngle(0);
    setIsSpinning(false);
    setSpinLocked(false);
    isSpinningRef.current = false;
    spinLockedRef.current = false;
    setEnrollOpen(true); // Re-open participation!
    enrollOpenRef.current = true;
    setAutoSpinCountdown(settings.autoSpinIntervalSec || 15);

    addFeedItem({
      type: 'system',
      text: '🔁 Yeni Tur Başlatıldı — Çark hazır!',
    });

  };

  const handleToggleEnroll = () => {
    // Tur devam ederken manuel buton otomatik kilidi aşamaz.
    if (roundInProgressRef.current || roundInProgress || isSpinningRef.current || spinLockedRef.current || lastRoundWinner) return;
    setEnrollOpen((prev) => {
      const next = !prev;
      enrollOpenRef.current = next;
      return next;
    });
  };

  const lockCurrentRoundForAutoSpin = () => {
    if (roundInProgressRef.current || lastRoundWinner) return;
    const active = participants.filter((p) => !p.isEliminated && p.rights > 0);
    // Oto çevir başlatıldığı anda mevcut listeyi sabitle; ilk dönüşün
    // başlamasını beklerken de yeni katılımcı/hak kabul edilmesin.
    if (active.length > 0) {
      roundInProgressRef.current = true;
      setRoundInProgress(true);
      enrollOpenRef.current = false;
      setEnrollOpen(false);
      setRoundParticipants([...participants]);
    }
  };

  const handleToggleAutoSpin = () => {
    const nextEnabled = !settingsRef.current.autoSpinEnabled;
    if (nextEnabled) lockCurrentRoundForAutoSpin();
    const interval = Math.max(1, settingsRef.current.autoSpinIntervalSec || 15);
    countdownRef.current = interval;
    setAutoSpinCountdown(interval);
    setSettings((prev) => ({ ...prev, autoSpinEnabled: nextEnabled }));
  };

  const handleControlPanelSettingsUpdate = (nextSettings: GameSettings) => {
    if (!settingsRef.current.autoSpinEnabled && nextSettings.autoSpinEnabled) {
      lockCurrentRoundForAutoSpin();
    }
    setSettings(nextSettings);
  };

  const handleResetParticipants = () => {
    setParticipants([]);
    setRoundParticipants([]);
    setLastRoundWinner(null);
    setRoundInProgress(false);
    roundInProgressRef.current = false;
    setSpinLocked(false);
    spinLockedRef.current = false;
    setEnrollOpen(true);
    enrollOpenRef.current = true;
    setCurrentAngle(0);
  };

  const handleResetWinners = () => {
    setWinners([]);
    localStorage.removeItem('tiktok_wheel_winners');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex flex-col">
      {/* Üst Yayıncı Görünüm Değiştirici Bar (Tam Ekranda Otomatik Gizlenir!) */}
      {!isFullscreen && (
        <div className="bg-slate-900 border-b border-white/10 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-black text-pink-500 tracking-tight text-sm">
              <span>🎡 ÇARKIX</span>
            </div>
            <div className="h-4 w-px bg-white/10 hidden sm:block" />
            <div className="flex items-center gap-1.5 text-slate-400">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>
                {tikTokStatus.status === 'connected_live' || tikTokStatus.status === 'receiving_events'
                  ? `🟢 @${tikTokStatus.username} LIVE`
                  : tikTokStatus.status === 'demo_active'
                  ? '🟡 Demo Modu Aktif'
                  : 'Bağlantı Yok'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode(viewMode === 'broadcast' ? 'control' : 'broadcast')}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-2 cursor-pointer transition-all ${
                viewMode === 'broadcast'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                  : 'bg-slate-800 text-slate-200 hover:bg-slate-700 border border-white/10'
              }`}
            >
              {viewMode === 'broadcast' ? (
                <>
                  <Sliders className="w-3.5 h-3.5" /> Yönetim Paneline Dön
                </>
              ) : (
                <>
                  <Tv className="w-3.5 h-3.5 text-pink-400" /> OBS Yayın Ekranını Aç
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Ana Görünüm Alanı */}
      <div className="flex-1">
        {viewMode === 'broadcast' ? (
          <BroadcastLayout
            participants={participants}
            winners={winners}
            recentEvents={feedEvents}
            settings={settings}
            isSpinning={isSpinning}
            spinLocked={spinLocked}
            roundInProgress={roundInProgress}
            enrollOpen={enrollOpen}
            currentAngle={currentAngle}
            targetAngle={targetAngle}
            lastRoundWinner={lastRoundWinner}
            roundParticipants={roundParticipants.length > 0 ? roundParticipants : participants}
            onSpinFinished={awardWinner}
            onNextRound={handleNextRound}
            onSpinWheel={handleSpinWheel}
            onToggleEnroll={handleToggleEnroll}
            onResetParticipants={handleResetParticipants}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
            onSwitchToControl={() => setViewMode('control')}
            autoSpinEnabled={settings.autoSpinEnabled}
            autoSpinIntervalSec={settings.autoSpinIntervalSec || 15}
            autoSpinCountdown={autoSpinCountdown}
            onToggleAutoSpin={handleToggleAutoSpin}
            onSetAutoSpinInterval={(sec) => {
              setSettings((prev) => ({
                ...prev,
                autoSpinIntervalSec: sec,
              }));
              setAutoSpinCountdown(sec);
            }}
            bigGiftAlert={bigGiftAlert}
            onCloseBigGiftAlert={() => setBigGiftAlert(null)}
            specialBonus={specialBonus}
            onFinishSpecialBonus={() => {
              if (!specialBonus) return;
              addRightsToParticipant(
                specialBonus.username,
                specialBonus.displayName,
                specialBonus.avatar,
                specialBonus.rights,
                'gift',
                `${specialBonus.giftName} — Özel Bonus Çarkı`
              );
              addFeedItem({
                type: 'gift',
                username: specialBonus.displayName,
                text: `🎁 Özel Bonus Çarkı: +${specialBonus.rights} hak kazandı!`,
                avatar: specialBonus.avatar,
              });
              setSpecialBonus(null);
            }}
            onCloseWinnerModal={closeWinnerAndResume}
            onEliminateWinner={handleEliminateWinner}
            onKeepWinner={handleKeepWinner}
          />
        ) : (
          <ControlPanel
            settings={settings}
            onUpdateSettings={handleControlPanelSettingsUpdate}
            tikTokStatus={tikTokStatus}
            onConnectTikTok={handleConnectTikTok}
            onDisconnectTikTok={handleDisconnectTikTok}
            onStartDemoMode={handleStartDemoMode}
            onFetchGifts={handleFetchGifts}
            participants={participants}
            winners={winners}
            onResetParticipants={handleResetParticipants}
            onResetWinners={handleResetWinners}
            onSimulateEvent={(type, payload) => {
              if (type === 'follow') {
                const u = String(payload.username || 'test_user');
                addRightsToParticipant(
                  u,
                  String(payload.displayName || payload.username || 'Test User'),
                  String(payload.avatar || getFallbackAvatar(u)),
                  settings.followRights,
                  'follow'
                );
              } else if (type === 'like') {
                const u = String(payload.username || 'test_user');
                processPersonLikes(
                  u,
                  String(payload.displayName || payload.username || 'Test User'),
                  String(payload.avatar || getFallbackAvatar(u)),
                  Number(payload.likeCount || 500)
                );
              } else if (type === 'gift') {
                const dia = Number(payload.diamondCount || 10);
                const gCount = Math.max(1, Number(payload.giftCount || 1));
                const totalDia = dia * gCount;
                const gName = String(payload.giftName || 'Hediye');
                const uName = String(payload.username || 'test_user');
                const dName = String(payload.displayName || payload.username || 'Test User');
                const av = String(payload.avatar || getFallbackAvatar(uName));

                // KULLANICI TALEBİ: 100 jeton üstü hediye çark DÖNMÜYORKEN profil fotoğrafı çıksın büyüsün büyüsün kesene bereketler olsun
                if (totalDia >= 100 && !isSpinningRef.current && !spinLockedRef.current) {
                  setBigGiftAlert({
                    id: Math.random().toString(36).substring(2, 9),
                    username: uName,
                    displayName: dName,
                    avatar: av,
                    giftName: gName,
                    diamonds: totalDia,
                    giftCount: gCount,
                    timestamp: Date.now(),
                  });
                  if (settings.soundEnabled) {
                    soundEngine.playBigGiftAlert(settings.masterVolume / 100);
                  }
                }

                addRightsToParticipant(
                  uName,
                  dName,
                  av,
                  Math.max(1, Math.floor(totalDia / 100)),
                  'gift',
                  `${gName} (${totalDia} Jeton)`
                );
              }
            }}
            onSpinWheel={handleSpinWheel}
            isSpinning={isSpinning}
            spinLocked={spinLocked}
            enrollOpen={enrollOpen}
            roundInProgress={roundInProgress}
            onToggleEnroll={handleToggleEnroll}
          />
        )}
      </div>

      {/* 100+ Jeton Büyük Hediye Kutlaması ("Kesene Bereketler Olsun!") */}
      <BigGiftAlert
        alert={bigGiftAlert}
        onDismiss={() => setBigGiftAlert(null)}
      />
    </div>
  );
}
