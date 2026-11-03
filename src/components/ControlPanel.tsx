import React, { useState } from 'react';
import { GameSettings, GiftRule, Participant, WinRecord, TikTokStatusState } from '../types';
import { soundEngine } from '../utils/audio';
import { getFallbackAvatar } from '../utils/avatars';
import {
  Radio,
  Gift,
  Heart,
  UserPlus,
  Volume2,
  Sliders,
  Play,
  RotateCcw,
  Download,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Search,
  Trophy,
} from 'lucide-react';

interface ControlPanelProps {
  settings: GameSettings;
  onUpdateSettings: (newSettings: GameSettings) => void;
  tikTokStatus: TikTokStatusState;
  onConnectTikTok: (username: string) => void;
  onDisconnectTikTok: () => void;
  onStartDemoMode: () => void;
  onFetchGifts: () => Promise<{ ok: boolean; message: string; count: number }>;
  participants: Participant[];
  winners: WinRecord[];
  onResetParticipants: () => void;
  onResetWinners: () => void;
  onSimulateEvent: (type: 'follow' | 'like' | 'gift', payload: Record<string, unknown>) => void;
  onSpinWheel: () => void;
  isSpinning: boolean;
  spinLocked: boolean;
  enrollOpen: boolean;
  roundInProgress: boolean;
  onToggleEnroll: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  settings,
  onUpdateSettings,
  tikTokStatus,
  onConnectTikTok,
  onDisconnectTikTok,
  onStartDemoMode,
  onFetchGifts,
  participants,
  winners,
  onResetParticipants,
  onResetWinners,
  onSimulateEvent,
  onSpinWheel,
  isSpinning,
  spinLocked,
  enrollOpen,
  roundInProgress,
  onToggleEnroll,
}) => {
  const [activeTab, setActiveTab] = useState<'tiktok' | 'gifts' | 'likes' | 'general' | 'sound' | 'test'>('tiktok');
  const [usernameInput, setUsernameInput] = useState<string>(tikTokStatus.username || '');
  const [giftFilter, setGiftFilter] = useState<string>('');
  const [isFetchingGifts, setIsFetchingGifts] = useState(false);
  const [giftFetchMessage, setGiftFetchMessage] = useState<string>('');

  // Handle gift rule property change - strictly updates ONLY the targeted index to prevent toggling all
  const handleUpdateGiftRule = (
    giftId: string,
    updates: Partial<GiftRule>,
    originalIndex?: number
  ) => {
    const updated = [...settings.giftRules];
    if (typeof originalIndex === 'number' && originalIndex >= 0 && originalIndex < updated.length) {
      updated[originalIndex] = { ...updated[originalIndex], ...updates };
    } else {
      const targetId = String(giftId).trim();
      const idx = updated.findIndex((r) => String(r.id).trim() === targetId);
      if (idx !== -1) {
        updated[idx] = { ...updated[idx], ...updates };
      }
    }
    onUpdateSettings({ ...settings, giftRules: updated });
  };

  const handleFetchGiftsClick = async () => {
    setIsFetchingGifts(true);
    setGiftFetchMessage('');
    try {
      const res = await onFetchGifts();
      setGiftFetchMessage(res.message);
    } catch (err: unknown) {
      setGiftFetchMessage(`Hata: ${(err as Error)?.message || 'Hediyeler alınamadı'}`);
    } finally {
      setIsFetchingGifts(false);
    }
  };

  const filteredGiftsWithIndex = settings.giftRules
    .map((g, originalIndex) => ({ gift: g, originalIndex }))
    .filter(({ gift }) =>
      gift.name.toLowerCase().includes(giftFilter.toLowerCase()) || String(gift.id).includes(giftFilter)
    );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-6 text-slate-100">
      {/* Üst Yönetim Sekmeleri */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 border-b border-white/10 mb-6 custom-scrollbar">
        <button
          onClick={() => setActiveTab('tiktok')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'tiktok'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Radio className="w-4 h-4" /> TikTok LIVE Bağlantısı
        </button>

        <button
          onClick={() => setActiveTab('gifts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'gifts'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Gift className="w-4 h-4" /> Hediye Sistemi ({settings.giftRules.length})
        </button>

        <button
          onClick={() => setActiveTab('likes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'likes'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Heart className="w-4 h-4" /> Kişi Başına Beğeni
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Sliders className="w-4 h-4" /> Çark & Oyun Kuralları
        </button>

        <button
          onClick={() => setActiveTab('sound')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'sound'
              ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/25'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Volume2 className="w-4 h-4" /> Ses & Efektler
        </button>

        <button
          onClick={() => setActiveTab('test')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer ${
            activeTab === 'test'
              ? 'bg-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25'
              : 'bg-slate-800/80 text-amber-400 hover:bg-slate-850'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Test & Simülasyon
        </button>
      </div>

      {/* TAB 1: TIKTOK LIVE BAĞLANTISI (User Requirement #2) */}
      {activeTab === 'tiktok' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Radio className="w-5 h-5 text-pink-500" /> TikTok LIVE Bağlantı Yönetimi
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Gerçek TikTok canlı yayınına bağlanarak izleyicilerin beğeni, takip ve hediyelerini anında çarka ekleyin.
            </p>

            {/* 5 Ayrı Bağlantı Durumu Göstergesi (User Requirement #2) */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  tikTokStatus.status !== 'server_offline'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                }`}
              >
                <div className="text-sm font-black mb-0.5">1. Yerel Sunucu</div>
                <div className="text-[11px] font-medium">
                  {tikTokStatus.status !== 'server_offline' ? '✅ Çalışıyor' : '❌ Kapalı'}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  tikTokStatus.status === 'connecting_tiktok'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                }`}
              >
                <div className="text-sm font-black mb-0.5">2. Bağlantı</div>
                <div className="text-[11px] font-medium">
                  {tikTokStatus.status === 'connecting_tiktok' ? '⏳ Kuruluyor' : 'Beklemede'}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  tikTokStatus.status === 'connected_live' || tikTokStatus.status === 'receiving_events'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                }`}
              >
                <div className="text-sm font-black mb-0.5">3. LIVE Durumu</div>
                <div className="text-[11px] font-medium">
                  {tikTokStatus.status === 'connected_live' || tikTokStatus.status === 'receiving_events'
                    ? '🟢 Bağlandı'
                    : 'Bağlı Değil'}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  tikTokStatus.status === 'receiving_events'
                    ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 animate-pulse'
                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                }`}
              >
                <div className="text-sm font-black mb-0.5">4. Canlı Olaylar</div>
                <div className="text-[11px] font-medium">
                  {tikTokStatus.status === 'receiving_events' ? '📡 Alınıyor' : 'Bekliyor'}
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border text-center transition-all ${
                  tikTokStatus.status === 'error'
                    ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                    : tikTokStatus.status === 'demo_active'
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800/50 border-white/5 text-slate-500'
                }`}
              >
                <div className="text-sm font-black mb-0.5">5. Durum Kodu</div>
                <div className="text-[11px] font-medium">
                  {tikTokStatus.status === 'error'
                    ? '❌ Hata'
                    : tikTokStatus.status === 'demo_active'
                    ? '🟡 Demo Modu'
                    : 'Normal'}
                </div>
              </div>
            </div>

            {/* Bağlantı Formu */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="TikTok Kullanıcı Adı (@kullanici_adi)"
                  className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white font-medium text-sm focus:outline-none focus:border-pink-500 transition-colors"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={() => onConnectTikTok(usernameInput)}
                  disabled={tikTokStatus.status === 'connecting_tiktok'}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-sm transition-all shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Radio className="w-4 h-4" /> TikTok'a Bağlan
                </button>

                {tikTokStatus.status === 'connected_live' || tikTokStatus.status === 'receiving_events' ? (
                  <button
                    onClick={onDisconnectTikTok}
                    className="px-4 py-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-sm transition-all cursor-pointer"
                  >
                    Bağlantıyı Kes
                  </button>
                ) : (
                  <button
                    onClick={onStartDemoMode}
                    className="px-4 py-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-bold text-sm transition-all cursor-pointer whitespace-nowrap"
                  >
                    🤖 Demo Başlat
                  </button>
                )}
              </div>
            </div>

            {/* Hata veya Bilgi Kutusu */}
            {tikTokStatus.lastError && (
              <div className="mt-4 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Bağlantı Hatası:</div>
                  <div>{tikTokStatus.lastError}</div>
                  <div className="mt-1 text-[11px] text-rose-300/80">
                    Kullanıcının o an yayında olduğundan ve kullanıcı adının doğru yazıldığından emin olun.
                  </div>
                </div>
              </div>
            )}

            {tikTokStatus.status === 'demo_active' && (
              <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <span>
                  <strong>Demo Modu Devrede:</strong> Gerçek hesap bağlanmadan simüle edilmiş takip, beğeni ve hediye verileri akar.
                </span>
              </div>
            )}

            {/* Canlı İstatistikler */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="text-slate-400 font-medium">Toplam Takip Olayı</div>
                <div className="text-xl font-bold font-mono text-cyan-400 mt-1">
                  {tikTokStatus.eventsCount.follows}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="text-slate-400 font-medium">Toplam Beğeni Olayı</div>
                <div className="text-xl font-bold font-mono text-pink-400 mt-1">
                  {tikTokStatus.eventsCount.likes}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="text-slate-400 font-medium">Toplam Hediye Olayı</div>
                <div className="text-xl font-bold font-mono text-amber-400 mt-1">
                  {tikTokStatus.eventsCount.gifts}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-800/40 border border-white/5">
                <div className="text-slate-400 font-medium">Bağlantı Süresi</div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1">
                  {Math.floor(tikTokStatus.uptimeSeconds / 60)}:
                  {(tikTokStatus.uptimeSeconds % 60).toString().padStart(2, '0')}
                </div>
              </div>
            </div>

            {/* Bağımsız Node.js Sunucusu İndirme */}
            <div className="mt-6 pt-5 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
              <div className="text-xs text-slate-400 max-w-xl">
                Kendi bilgisayarınızda OBS ve TikTok Live Connector çalıştırmak isterseniz bağımsız sunucu dosyasını indirebilirsiniz.
              </div>
              <a
                href="/api/download-server-script"
                download="server.mjs"
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-white/10 text-xs font-bold text-slate-200 flex items-center gap-2 cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>server.mjs İndir</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEDİYE SİSTEMİ (User Requirement #1 & #5) */}
      {activeTab === 'gifts' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500" /> TikTok Hediye Kataloğu & Özel Kurallar
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Hediyeleri TikTok Webcast veya canlı yayından otomatik çekebilir, her hediye için kaç hak verileceğini ve özel eylemlerini belirleyebilirsiniz.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleFetchGiftsClick}
                  disabled={isFetchingGifts}
                  className="px-4 py-2.5 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-md shadow-pink-500/20 transition-all"
                >
                  <Gift className="w-4 h-4" />
                  <span>{isFetchingGifts ? 'Hediyeler Alınıyor...' : 'Hediyeleri Otomatik Çek'}</span>
                </button>
              </div>
            </div>

            {giftFetchMessage && (
              <div className="mb-4 p-3 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{giftFetchMessage}</span>
              </div>
            )}

            {/* Hediye Sistemi Ana Aç/Kapa ve Hızlı Seçim Butonları */}
            <div className="p-4 mb-5 rounded-2xl bg-slate-800/80 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.giftEnabled}
                  onClick={() => onUpdateSettings({ ...settings, giftEnabled: !settings.giftEnabled })}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    settings.giftEnabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.giftEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <div>
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <span>Hediye Sistemi Genel Durumu:</span>
                    <span className={settings.giftEnabled ? 'text-emerald-400' : 'text-rose-400'}>
                      {settings.giftEnabled ? 'AKTİF (Hediyeler Çark Hakkı Verir)' : 'DEVRE DIŞI'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Aşağıda yalnızca tek tek &quot;Açık&quot; yaptığınız hediyeler çarka hak ekler.
                  </div>
                </div>
              </div>

              <div className="text-slate-300 font-mono text-xs bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/5">
                Seçili: <span className="font-bold text-emerald-400">{settings.giftRules.filter((g) => g.enabled).length}</span> / {settings.giftRules.length} Hediye Açık
              </div>
            </div>

            {/* Hızlı Seçim Butonları (Kullanıcı Talebi: İstediğimizi biz seçelim, hepsi otomatik seçili olmasın) */}
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    const onlyRose = settings.giftRules.map((g) => ({
                      ...g,
                      enabled: g.id === '5655' || g.name.toLowerCase().includes('gül') || g.name.toLowerCase().includes('rose'),
                    }));
                    onUpdateSettings({ ...settings, giftRules: onlyRose });
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>🌹 Yalnızca Gül&apos;ü Aç</span>
                </button>

                <button
                  onClick={() => {
                    const top3Ids = ['5655', '6037', '6267']; // Gül, Beni Sev, Çay
                    const top3On = settings.giftRules.map((g) => ({
                      ...g,
                      enabled: top3Ids.includes(String(g.id)) || g.name.toLowerCase().includes('gül') || g.name.toLowerCase().includes('rose'),
                    }));
                    onUpdateSettings({ ...settings, giftRules: top3On });
                  }}
                  className="px-3 py-2 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/30 font-bold cursor-pointer transition-colors flex items-center gap-1.5"
                >
                  <span>⭐ Popüler 3 Hediyeyi Aç</span>
                </button>

                <button
                  onClick={() => {
                    const allOff = settings.giftRules.map((g) => ({ ...g, enabled: false }));
                    onUpdateSettings({ ...settings, giftRules: allOff });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-bold cursor-pointer transition-colors"
                >
                  <span>❌ Tümünü Kapat (Sıfırla)</span>
                </button>

                <button
                  onClick={() => {
                    const allOn = settings.giftRules.map((g) => ({ ...g, enabled: true }));
                    onUpdateSettings({ ...settings, giftRules: allOn });
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 font-bold cursor-pointer transition-colors"
                >
                  <span>✅ Tümünü Seç</span>
                </button>
              </div>
            </div>

            {/* Arama ve Filtre */}
            <div className="relative mb-4">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={giftFilter}
                onChange={(e) => setGiftFilter(e.target.value)}
                placeholder="Hediye adı veya ID ile filtrele..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-800/80 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>

            {/* Hediye Kuralları Tablosu (Her satır bağımsız indeksle güncellenir) */}
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/90 text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">Görsel</th>
                    <th className="py-3 px-4">Hediye Adı & ID</th>
                    <th className="py-3 px-4">Jeton</th>
                    <th className="py-3 px-4">Açık / Kapalı</th>
                    <th className="py-3 px-4">Verilecek Hak</th>
                    <th className="py-3 px-4">Tetiklenen Eylem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {filteredGiftsWithIndex.map(({ gift, originalIndex }) => (
                    <tr
                      key={`${gift.id}-${originalIndex}`}
                      className={`transition-colors ${
                        gift.enabled ? 'bg-pink-500/[0.04] hover:bg-pink-500/[0.08]' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        {gift.imageUrl ? (
                          <img
                            src={gift.imageUrl}
                            alt={gift.name}
                            className="w-9 h-9 rounded-lg object-contain bg-slate-800 p-0.5 border border-white/10"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.image';
                            }}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-base border border-white/10">
                            🎁
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span>{gift.name}</span>
                          {gift.enabled && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                              AKTİF
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 font-normal">ID: {gift.id}</div>
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-amber-300">
                        💎 {gift.diamondValue}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(gift.enabled)}
                            onClick={() =>
                              handleUpdateGiftRule(gift.id, { enabled: !gift.enabled }, originalIndex)
                            }
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                              gift.enabled ? 'bg-pink-500' : 'bg-slate-700'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                gift.enabled ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-bold ${
                              gift.enabled ? 'text-pink-400' : 'text-slate-500'
                            }`}
                          >
                            {gift.enabled ? 'AÇIK' : 'KAPALI'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        {gift.action === 'special_bonus' ? (
                          <span className="inline-flex rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-[11px] font-black text-amber-300">
                            🎲 1–8 Rastgele
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={500}
                              value={gift.rights}
                              onChange={(e) =>
                                handleUpdateGiftRule(
                                  gift.id,
                                  { rights: Math.max(0, parseInt(e.target.value) || 0) },
                                  originalIndex
                                )
                              }
                              className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-pink-500 text-center"
                            />
                            <span className="text-slate-400 text-[11px]">Hak</span>
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <select
                          value={gift.action}
                          onChange={(e) =>
                            handleUpdateGiftRule(
                              gift.id,
                              {
                                action: e.target.value as 'rights' | 'instant_spin' | 'special_bonus' | 'disabled',
                              },
                              originalIndex
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-white/10 text-white font-medium focus:outline-none focus:border-pink-500 text-xs"
                        >
                          <option value="rights">Normal Hak Ekle</option>
                          <option value="instant_spin">⚡ Anında Çarkı Döndür</option>
                          <option value="special_bonus">🌟 Özel Bonus Hak</option>
                          <option value="disabled">Devre Dışı</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: KİŞİ BAŞINA BEĞENİ SİSTEMİ (User Requirement #3) */}
      {activeTab === 'likes' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5 text-rose-500" /> Kişi Başına Beğeni Ayarları & İzleyici Takibi
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              <strong>Önemli Kural:</strong> Yayıncının toplam yayın beğenisi kullanılmaz. Her izleyicinin gönderdiği beğeni miktarı ayrı ayrı birikir ve eşiklere ulaştıkça hak kazanır.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Kişi Başına Beğeni Eşiği
                </label>
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={settings.likeThresholdPerUser}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      likeThresholdPerUser: Math.max(10, parseInt(e.target.value) || 500),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 font-mono font-bold text-white focus:outline-none focus:border-pink-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">Örn. Her 500 kişisel beğeniye ulaşıldığında.</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Eşikte Verilecek Hak
                </label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={settings.likeRightsPerThreshold}
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      likeRightsPerThreshold: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 font-mono font-bold text-white focus:outline-none focus:border-pink-500"
                />
                <div className="text-[11px] text-slate-400 mt-1">Her eşik geçişinde çarka eklenecek hak.</div>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                  Eşik Katları (Kümülatif)
                </label>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-slate-300">500, 1.000, 1.500... katlarında hak ver</span>
                  <input
                    type="checkbox"
                    checked={settings.allowThresholdMultipliers}
                    onChange={(e) =>
                      onUpdateSettings({
                        ...settings,
                        allowThresholdMultipliers: e.target.checked,
                      })
                    }
                    className="w-5 h-5 rounded accent-pink-500"
                  />
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Kullanıcı beğendikçe yeni haklar kazanır.</div>
              </div>
            </div>

            {/* İzleyicilerin Kişisel Beğeni Tablosu (Canlı Denetim) */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <span>Canlı İzleyici Beğeni Sayaçları</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300">
                  {participants.length} İzleyici
                </span>
              </h3>

              <div className="overflow-x-auto rounded-xl border border-white/10 max-h-72">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-800/90 text-slate-400 font-semibold uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="py-2.5 px-4">Kullanıcı</th>
                      <th className="py-2.5 px-4">Kişisel Gönderilen Beğeni</th>
                      <th className="py-2.5 px-4">Tamamlanan Eşik</th>
                      <th className="py-2.5 px-4">Sonraki Haka Kalan</th>
                      <th className="py-2.5 px-4">Aktif Çark Hakkı</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300">
                    {participants.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-500">
                          Henüz beğeni gönderen izleyici yok.
                        </td>
                      </tr>
                    ) : (
                      participants.map((p) => {
                        const threshold = settings.likeThresholdPerUser;
                        const remainder = p.likesAccumulated % threshold;
                        const needed = threshold - remainder;
                        return (
                          <tr key={p.id} className="hover:bg-white/[0.02]">
                            <td className="py-2 px-4 font-bold text-white flex items-center gap-2">
                              {p.avatar ? (
                                <img src={p.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px]">
                                  {p.username[0]?.toUpperCase()}
                                </div>
                              )}
                              <span>{p.displayName || p.username}</span>
                            </td>
                            <td className="py-2 px-4 font-mono font-bold text-rose-400">
                              ❤️ {p.likesAccumulated.toLocaleString('tr')}
                            </td>
                            <td className="py-2 px-4 font-mono text-slate-200">
                              {p.thresholdsCompleted} kez
                            </td>
                            <td className="py-2 px-4 font-mono text-cyan-300">
                              {needed.toLocaleString('tr')} beğeni kaldı
                            </td>
                            <td className="py-2 px-4 font-mono font-black text-pink-400">
                              {p.rights} hak
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: GENEL ÇARK & OYUN KURALLARI */}
      {activeTab === 'general' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
              <Sliders className="w-5 h-5 text-pink-500" /> Çark Kapasitesi, Takip ve Kazanma Kuralları
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Ödül & Kapasite */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Ödül Adı
                  </label>
                  <input
                    type="text"
                    value={settings.prizeName}
                    onChange={(e) => onUpdateSettings({ ...settings, prizeName: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-medium focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Çark Maksimum Kapasitesi (Toplam Hak)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={5000}
                    value={settings.wheelCapacity}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, wheelCapacity: Math.max(10, parseInt(e.target.value) || 200) })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-pink-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kişi Başı Yüzdelik Hak Sınırı (%)
                  </label>
                  <select
                    value={settings.maxPercentPerUser}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, maxPercentPerUser: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-medium focus:outline-none focus:border-pink-500"
                  >
                    <option value={1}>%1 (Maksimum {Math.max(1, Math.floor(settings.wheelCapacity * 0.01))} hak)</option>
                    <option value={2}>%2 (Maksimum {Math.max(1, Math.floor(settings.wheelCapacity * 0.02))} hak)</option>
                    <option value={5}>%5 (Maksimum {Math.max(1, Math.floor(settings.wheelCapacity * 0.05))} hak)</option>
                    <option value={10}>%10 (Maksimum {Math.max(1, Math.floor(settings.wheelCapacity * 0.1))} hak)</option>
                    <option value={20}>%20 (Maksimum {Math.max(1, Math.floor(settings.wheelCapacity * 0.2))} hak)</option>
                    <option value={0}>Limitsiz (Yüzde Yok)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Kişi Başı Sabit Hak Sınırı (Sayı Olarak)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={settings.maxRightsPerUser || 0}
                      onChange={(e) =>
                        onUpdateSettings({
                          ...settings,
                          maxRightsPerUser: Math.max(0, parseInt(e.target.value) || 0),
                        })
                      }
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-pink-500"
                      placeholder="0 = Sadece yüzde veya limitsiz"
                    />
                    <span className="text-xs text-slate-400 whitespace-nowrap">Hak (0=Limitsiz)</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Örn: 5 yazarsanız hiçbir kullanıcı 5 haktan fazla alamaz (hediye, beğeni ve takip dahil).
                  </div>
                </div>
              </div>

              {/* Takip & Eleme */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-200">
                      Takip ile Katılım
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.followEnabled}
                      onChange={(e) => onUpdateSettings({ ...settings, followEnabled: e.target.checked })}
                      className="w-5 h-5 rounded accent-pink-500"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-400">1 Takip =</span>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={settings.followRights}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, followRights: Math.max(1, parseInt(e.target.value) || 1) })
                      }
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/10 font-mono font-bold text-white text-center"
                    />
                    <span className="text-xs text-slate-400">Hak</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200">
                        ⚡ Otomatik Çevirme Modu
                      </div>
                      <div className="text-[11px] text-slate-400">Çark durunca belirlenen süre sonra kendiliğinden tekrar döner</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSpinEnabled}
                      onChange={(e) => onUpdateSettings({ ...settings, autoSpinEnabled: e.target.checked })}
                      className="w-5 h-5 rounded accent-amber-400 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-xs text-slate-400">Çevirme Aralığı:</span>
                    <select
                      value={settings.autoSpinIntervalSec || 15}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, autoSpinIntervalSec: Number(e.target.value) || 15 })
                      }
                      className="px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 font-mono font-bold text-amber-300 text-xs focus:outline-none"
                    >
                      <option value={1}>1 sn (Ultra Hızlı)</option>
                      <option value={3}>3 sn (Hızlı)</option>
                      <option value={5}>5 sn</option>
                      <option value={10}>10 sn</option>
                      <option value={15}>15 sn</option>
                      <option value={20}>20 sn</option>
                      <option value={30}>30 sn</option>
                      <option value={45}>45 sn</option>
                      <option value={60}>60 sn</option>
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200">
                        Kayan Bildirim Şeridi (Marquee)
                      </div>
                      <div className="text-[11px] text-slate-400">Çarkın üstündeki kayan bildirimleri göster/gizle</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.showMarqueeNotifications}
                      onChange={(e) =>
                        onUpdateSettings({ ...settings, showMarqueeNotifications: e.target.checked })
                      }
                      className="w-5 h-5 rounded accent-pink-500"
                    />
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs uppercase tracking-wider text-slate-200">
                        WIN Liderlik Tablosunu Sıfırla
                      </div>
                      <div className="text-[11px] text-slate-400">Yayıncı isterse oturum başında geçmişi temizler</div>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm('Tüm WIN liderlik tablosu sıfırlansın mı?')) {
                          onResetWinners();
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                    >
                      Sıfırla
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Çark Çevirme Kontrolleri */}
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={onSpinWheel}
                  disabled={isSpinning || spinLocked || participants.filter((p) => !p.isEliminated && p.rights > 0).length === 0}
                  className="px-6 py-3 rounded-xl bg-pink-500 hover:bg-pink-600 disabled:opacity-40 text-white font-black text-sm shadow-lg shadow-pink-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" /> Çarkı Döndür
                </button>

                <button
                  onClick={onToggleEnroll}
                  disabled={roundInProgress}
                  title={roundInProgress ? 'Kazanan belirlenene kadar katılım otomatik kilitli' : 'Katılımı aç veya kapat'}
                  className={`px-4 py-3 rounded-xl font-bold text-sm border transition-all cursor-pointer ${
                    roundInProgress
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/30 cursor-not-allowed opacity-80'
                      : enrollOpen
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30 hover:bg-rose-500/30'
                  }`}
                >
                  {roundInProgress ? '🔒 Tur Bitene Kadar Kilitli' : enrollOpen ? '✅ Katılım Açık' : '🔒 Katılım Kapalı'}
                </button>
              </div>

              <button
                onClick={() => {
                  if (confirm('Tüm katılımcılar silinsin ve çark sıfırlansın mı?')) {
                    onResetParticipants();
                  }
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Katılımcıları Temizle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SES & EFEKTLER (User Requirement #6) */}
      {activeTab === 'sound' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Volume2 className="w-5 h-5 text-pink-500" /> Ses Sistemi & Özel Sesler
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Çark dönerken hızına duyarlı tıkırtı sesi, durma sesi ve zafer melodisi Web Audio API ile dahili olarak sentezlenir veya özel MP3 URL'si atanabilir.
            </p>

            <div className="space-y-6 max-w-2xl">
              {/* Ana Ses Açma/Kapama */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-800/60 border border-white/10">
                <div>
                  <div className="font-bold text-sm text-white">Tüm Sesleri Etkinleştir</div>
                  <div className="text-xs text-slate-400">Çark, eleme ve zafer seslerini açar/kapatır</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => onUpdateSettings({ ...settings, soundEnabled: e.target.checked })}
                  className="w-5 h-5 rounded accent-pink-500"
                />
              </div>

              {/* Ses Seviyesi Slayderları */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>Çark Dönüş Sesi</span>
                    <span className="font-mono text-pink-400">{settings.spinVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.spinVolume}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, spinVolume: parseInt(e.target.value) || 0 })
                    }
                    className="w-full accent-pink-500"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        soundEngine.unlockAudio();
                        soundEngine.playSectorTick(1.0, settings.spinVolume / 100);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200"
                    >
                      ▶ Tık Sesi Test
                    </button>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
                    <span>Zafer (WIN) Müziği Sesi</span>
                    <span className="font-mono text-amber-400">{settings.winVolume}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={settings.winVolume}
                    onChange={(e) =>
                      onUpdateSettings({ ...settings, winVolume: parseInt(e.target.value) || 0 })
                    }
                    className="w-full accent-amber-400"
                  />
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => {
                        soundEngine.unlockAudio();
                        soundEngine.playVictoryFanfare(settings.customWinUrl, settings.winVolume / 100);
                      }}
                      className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-bold text-slate-200"
                    >
                      ▶ Zafer Müziği Test
                    </button>
                  </div>
                </div>
              </div>

              {/* Özel Ses URL Girişleri */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Özel Zafer Müziği MP3 URL (Opsiyonel)
                  </label>
                  <input
                    type="text"
                    value={settings.customWinUrl}
                    onChange={(e) => onUpdateSettings({ ...settings, customWinUrl: e.target.value })}
                    placeholder="https://example.com/zafer.mp3"
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-pink-500"
                  />
                  <div className="text-[11px] text-slate-400 mt-1">
                    Boş bırakılırsa yüksek kaliteli yerleşik sentezleyici fanfarı çalar.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: TEST & SİMÜLASYON */}
      {activeTab === 'test' && (
        <div className="space-y-6">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" /> Canlı Yayın Simülasyonu & Test Kontrolleri
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Yayında değilken sistemi test etmek için takipçi, beğeni veya hediye gönderimlerini manuel simüle edebilirsiniz.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sm text-cyan-300 mb-1">👤 Test Takip Gönder</div>
                  <div className="text-xs text-slate-400">Rastgele bir kullanıcıdan takip olayı üretir.</div>
                </div>
                <button
                  onClick={() => {
                    const u = `takipci_${Math.floor(100 + Math.random() * 900)}`;
                    onSimulateEvent('follow', {
                      username: u,
                      displayName: `Takipçi ${u.split('_')[1]}`,
                      avatar: getFallbackAvatar(u),
                    });
                  }}
                  className="mt-4 w-full py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 text-xs font-bold cursor-pointer"
                >
                  +1 Takipçi Gönder
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sm text-rose-300 mb-1">❤️ Test Beğeni Gönder</div>
                  <div className="text-xs text-slate-400">Ahmet adlı kullanıcıya {settings.likeThresholdPerUser} beğeni ekler.</div>
                </div>
                <button
                  onClick={() =>
                    onSimulateEvent('like', {
                      username: 'ahmet_streamer',
                      displayName: 'Ahmet',
                      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop',
                      likeCount: settings.likeThresholdPerUser,
                    })
                  }
                  className="mt-4 w-full py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold cursor-pointer"
                >
                  +{settings.likeThresholdPerUser} Kişisel Beğeni (Ahmet)
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/10 flex flex-col justify-between">
                <div>
                  <div className="font-bold text-sm text-amber-300 mb-1">🎁 Test Hediye Gönder</div>
                  <div className="text-xs text-slate-400">Gül veya Taç hediyesi gönderir.</div>
                </div>
                <div className="flex flex-col gap-2 mt-4">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() =>
                        onSimulateEvent('gift', {
                          username: 'mehmet_fan',
                          displayName: 'Mehmet',
                          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop',
                          giftId: '5655',
                          giftName: 'Gül (Rose)',
                          diamondCount: 1,
                        })
                      }
                      className="py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                    >
                      🌹 Gül (1 Jeton)
                    </button>
                    <button
                      onClick={() =>
                        onSimulateEvent('gift', {
                          username: 'zeynep_pro',
                          displayName: 'Zeynep',
                          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop',
                          giftId: '6064',
                          giftName: 'Taç (Crown)',
                          diamondCount: 1000,
                        })
                      }
                      className="py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                    >
                      👑 Taç (1.000 Jeton)
                    </button>
                  </div>

                  <button
                    onClick={() =>
                      onSimulateEvent('gift', {
                        username: 'kadir_baba',
                        displayName: 'Kadir Bey',
                        avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=250&h=250&fit=crop',
                        giftId: '6064',
                        giftName: 'TikTok Universe',
                        diamondCount: 500,
                      })
                    }
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-amber-500/30 via-pink-500/30 to-amber-500/30 hover:from-amber-500/40 hover:to-pink-500/40 text-amber-200 border border-amber-400/50 text-xs font-black shadow-md cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <span>✨</span>
                    <span>100+ Jeton Büyük Hediye Testi ("Kesene Bereketler Olsun!")</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
