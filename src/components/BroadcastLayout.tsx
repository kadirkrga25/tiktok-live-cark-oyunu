import React, { useState, useEffect } from 'react';
import {
  Participant,
  AppSettings,
  BigGiftCelebration,
  WinRecord,
} from '../types';
import { WheelCanvas } from './WheelCanvas';
import { ParticipantsList } from './ParticipantsList';
import { RecentEventsFeed, StreamFeedEvent } from './RecentEventsFeed';
import { BigGiftAlert } from './BigGiftAlert';
import { SpecialBonusWheel } from './SpecialBonusWheel';
import { WinnerModal } from './WinnerModal';
import {
  Play,
  RotateCcw,
  Maximize2,
  Minimize2,
  Zap,
  Lock,
  Radio,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  Users,
} from 'lucide-react';

export interface BroadcastLayoutProps {
  participants: Participant[];
  winners?: Participant[] | WinRecord[];
  recentEvents?: StreamFeedEvent[];
  events?: StreamFeedEvent[];
  settings: AppSettings;
  isSpinning: boolean;
  spinLocked?: boolean;
  enrollOpen?: boolean;
  currentAngle?: number;
  targetAngle?: number;
  lastRoundWinner?: Participant | null;
  winner?: Participant | null;
  roundParticipants?: Participant[];
  onSpinFinished?: (winner: Participant) => void;
  onSpinEnd?: (winner: Participant) => void;
  onSpinStart?: () => void;
  onSpinWheel?: () => void;
  onNextRound?: () => void;
  onToggleEnroll?: () => void;
  onResetParticipants?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onSwitchToControl?: () => void;
  autoSpinEnabled?: boolean;
  autoSpinIntervalSec?: number;
  autoSpinCountdown?: number;
  onToggleAutoSpin?: () => void;
  onSetAutoSpinInterval?: (sec: number) => void;
  bigGiftAlert?: BigGiftCelebration | null;
  specialBonus?: { id: string; username: string; displayName: string; avatar: string; giftName: string; rights: number } | null;
  onFinishSpecialBonus?: () => void;
  onCloseBigGiftAlert?: () => void;
  onDismissBigGift?: () => void;
  onCloseWinnerModal?: () => void;
  onEliminateWinner?: (winnerId: string) => void;
  onKeepWinner?: () => void;
  onUpdateSettings?: (newSettings: Partial<AppSettings>) => void;
  onUpdateRights?: (id: string, delta: number) => void;
  onRemoveParticipant?: (id: string) => void;
  onClearAllParticipants?: () => void;
  onConnectTikTok?: (username: string) => void;
  onDisconnectTikTok?: () => void;
}

export const BroadcastLayout: React.FC<BroadcastLayoutProps> = ({
  participants,
  recentEvents,
  events,
  settings,
  isSpinning,
  spinLocked = false,
  currentAngle = 0,
  targetAngle = 0,
  lastRoundWinner,
  winner,
  roundParticipants,
  onSpinFinished,
  onSpinEnd,
  onSpinWheel,
  onSpinStart,
  onResetParticipants,
  isFullscreen: propIsFullscreen,
  onToggleFullscreen,
  onSwitchToControl,
  autoSpinCountdown: propAutoSpinCountdown,
  onToggleAutoSpin,
  onSetAutoSpinInterval,
  bigGiftAlert,
  specialBonus,
  onFinishSpecialBonus,
  onCloseBigGiftAlert,
  onDismissBigGift,
  onCloseWinnerModal,
  onEliminateWinner,
  onKeepWinner,
  onUpdateSettings,
  onUpdateRights,
  onRemoveParticipant,
  onClearAllParticipants,
}) => {
  const [internalFullscreen, setInternalFullscreen] = useState(false);

  const isFullscreen = propIsFullscreen ?? internalFullscreen;

  const toggleFullscreen = () => {
    if (onToggleFullscreen) {
      onToggleFullscreen();
      return;
    }
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setInternalFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setInternalFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setInternalFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const totalRights = participants.reduce((sum, p) => sum + p.rights, 0);
  const activeWinner = lastRoundWinner || winner || null;
  const feedList = recentEvents || events || [];
  const countdown = propAutoSpinCountdown ?? settings.autoSpinCountdown ?? 15;
  const autoSpinActive = settings.autoSpinEnabled;

  const handleStartSpin = () => {
    if (onSpinWheel) {
      onSpinWheel();
    } else if (onSpinStart) {
      onSpinStart();
    }
  };

  const activeGifts = (settings.giftRules || []).filter((g) => g.enabled && g.action !== 'disabled');

  return (
    <div className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans ${isFullscreen ? 'p-2' : 'p-4 md:p-6'}`}>
      {/* Broadcast Header Bar */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 via-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-900/30">
            <span className="text-xl">🎯</span>
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black tracking-tight text-white flex items-center gap-2">
              TikTok LIVE Çarkıfelek
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                PRO YAYIN
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {settings.isConnected ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  @{settings.tiktokUsername} Canlı Bağlı
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Radio className="w-3.5 h-3.5" />
                  Yayın Bağlantısı Bekleniyor
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Live Broadcast Controls & Status Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Çark dönerken katılım kilitli göstergesi */}
          {(isSpinning || spinLocked) && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-xs font-black animate-pulse shadow-lg">
              <Lock className="w-3.5 h-3.5" />
              <span>ÇARK DÖNÜYOR • KATILIM KİLİTLİ</span>
            </div>
          )}

          {/* Hızlı Otomatik Çevirme Çubuğu */}
          <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-xl p-1 shadow-md">
            <button
              onClick={() => {
                if (onToggleAutoSpin) {
                  onToggleAutoSpin();
                } else if (onUpdateSettings) {
                  onUpdateSettings({ autoSpinEnabled: !settings.autoSpinEnabled });
                }
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition cursor-pointer ${
                autoSpinActive
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Otomatik Çevirme Modunu Aç/Kapat"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>OTO ÇEVİR</span>
              {autoSpinActive && (
                <span className="ml-1 px-1.5 py-0.2 bg-slate-950 text-amber-300 rounded font-mono text-[11px]">
                  {countdown}s
                </span>
              )}
            </button>

            {/* Hızlı Saniye Seçimi (Kullanıcı Talebi: 1s, 3s, 5s, 10s butonları doğrudan ekranda olsun) */}
            <div className="flex items-center gap-0.5 border-l border-slate-800 ml-1.5 pl-1.5">
              {[1, 3, 5, 10, 15].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    if (onSetAutoSpinInterval) {
                      onSetAutoSpinInterval(sec);
                    } else if (onUpdateSettings) {
                      onUpdateSettings({ autoSpinInterval: sec, autoSpinCountdown: sec, autoSpinIntervalSec: sec });
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-extrabold transition cursor-pointer ${
                    (settings.autoSpinIntervalSec === sec || settings.autoSpinInterval === sec)
                      ? 'bg-slate-800 text-amber-400 font-black'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                  title={`${sec} saniyede bir otomatik çevir`}
                >
                  {sec}s
                </button>
              ))}
            </div>
          </div>

          {/* Manuel Çevirme Butonu */}
          <button
            onClick={handleStartSpin}
            disabled={isSpinning || spinLocked || participants.length === 0}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-black shadow-lg shadow-rose-900/40 transition active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{isSpinning ? 'DÖNÜYOR...' : 'ŞİMDİ ÇEVİR'}</span>
          </button>

          {/* Katılımcıları Sıfırla */}
          {onResetParticipants && (
            <button
              onClick={onResetParticipants}
              disabled={isSpinning || participants.length === 0}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 rounded-xl transition cursor-pointer disabled:opacity-30"
              title="Katılımcı Listesini Sıfırla"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Ses Aç / Kapa */}
          {onUpdateSettings && (
            <button
              onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition cursor-pointer"
              title={settings.soundEnabled ? 'Sesi Kapat' : 'Sesi Aç'}
            >
              {settings.soundEnabled ? <Volume2 className="w-4 h-4 text-rose-400" /> : <VolumeX className="w-4 h-4" />}
            </button>
          )}

          {/* Tam Ekran Modu (Kullanıcı Talebi: Yayın modunda tam ekran yapma modu getir daha iyi ve güzel olur) */}
          <button
            onClick={toggleFullscreen}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-bold transition cursor-pointer"
            title="Yayın Tam Ekran Modu"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{isFullscreen ? 'Küçült' : 'Tam Ekran'}</span>
          </button>

          {/* Yönetim / Kontrol Paneli Butonu */}
          {onSwitchToControl && (
            <button
              onClick={onSwitchToControl}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl transition cursor-pointer"
              title="Yönetim Paneline Dön"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Main Broadcast Studio View */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4 items-start">
        {/* Left Column: Wheel Canvas & Live Banner */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col items-center justify-center relative p-4 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-sm min-h-[560px]">
          {/* Top Live Stats Bar */}
          <div className="w-full flex items-center justify-between mb-2 px-2">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
                <Users className="w-3.5 h-3.5 text-rose-500" />
                {participants.length} Katılımcı
              </span>
              <span className="px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-xl text-xs font-bold text-amber-400">
                {totalRights} Toplam Hak
              </span>
            </div>

            {/* Auto Spin Live Indicator */}
            {autoSpinActive && (
              <div className="flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-extrabold text-amber-300 animate-pulse">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Oto Çevirme: {countdown} sn</span>
              </div>
            )}
          </div>

          {/* KULLANICI TALEBİ: "ekranda en üstte hangi hediyeler açıksa onları koy kaç hak verildiğini yaz altına örneğin rosa açık 1 veriyor rosanın resmini koy altına +1 hak yaz direk böyle hazır bir şekilde yayın modunda gelsin" */}
          {activeGifts.length > 0 && (
            <div className="w-full mb-3 flex items-center justify-start sm:justify-center gap-2 overflow-x-auto py-2 px-3 bg-slate-950/70 border border-slate-800/90 rounded-2xl shadow-inner custom-scrollbar">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-400 shrink-0 px-1.5 flex items-center gap-1">
                🎁 AKTİF HEDİYELER:
              </span>
              {activeGifts.slice(0, 12).map((g) => (
                <div
                  key={g.id}
                  className="flex flex-col items-center justify-center px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-pink-500/30 rounded-xl shrink-0 transition-transform hover:scale-105 shadow-sm min-w-[58px]"
                  title={`${g.name} (${g.diamondValue} Jeton) = +${g.rights} Hak`}
                >
                  <img
                    src={g.imageUrl || 'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.image'}
                    alt={g.name}
                    className="w-7 h-7 object-contain drop-shadow"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://p16-webcast.tiktokcdn.com/img/maliva/webcast-va/resource/rose.png~tplv-obj.image';
                    }}
                  />
                  <span className="text-[11px] font-black text-amber-300 mt-0.5 tracking-tight">
                    +{g.rights} Hak
                  </span>
                </div>
              ))}
              {activeGifts.length > 12 && (
                <span className="text-[10px] font-bold text-slate-400 shrink-0 px-1">
                  +{activeGifts.length - 12} hediye
                </span>
              )}
            </div>
          )}

          {/* Wheel Component */}
          <WheelCanvas
            participants={participants}
            isSpinning={isSpinning}
            currentAngle={currentAngle}
            targetAngle={targetAngle}
            onSpinFinished={onSpinFinished || onSpinEnd}
            prizeName="Büyük Ödül"
            soundEnabled={settings.soundEnabled}
            soundVolume={settings.soundVolume}
          />

          {/* Broadcast Bottom Rules Banner */}
          <div className="w-full mt-4 p-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl flex flex-wrap items-center justify-around gap-2 text-center text-xs">
            <div className="text-slate-300 font-semibold">
              🌹 <span className="text-white font-bold">Gül:</span> +1 Hak
            </div>
            <div className="text-slate-300 font-semibold">
              ❤️ <span className="text-white font-bold">{settings.likeThreshold || 50} Beğeni:</span> +{settings.likeRightsPerThreshold || 1} Hak
            </div>
            {settings.enableMaxRightsLimit && (
              <div className="text-amber-300 font-bold">
                ⚠️ Maksimum Hak: {settings.maxRightsPerUser}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Participants List & Live Events */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4">
          <div className="h-[280px]">
            <ParticipantsList
              participants={participants}
              maxRightsLimit={settings.maxRightsPerUser}
              enableMaxLimit={Boolean(settings.enableMaxRightsLimit)}
              onUpdateRights={onUpdateRights || (() => {})}
              onRemoveParticipant={onRemoveParticipant || (() => {})}
              onClearAll={onClearAllParticipants || onResetParticipants || (() => {})}
            />
          </div>

          <div className="h-[280px]">
            <RecentEventsFeed events={feedList} />
          </div>
        </div>
      </main>

      {/* Special 100+ Jeton Big Gift Animation ("KESENE BEREKET OLSUN!") */}
      <BigGiftAlert
        alert={bigGiftAlert || null}
        onDismiss={onCloseBigGiftAlert || onDismissBigGift || (() => {})}
      />

      {/* Special bonus vertical wheel: rolls 1-8 and awards the result */}
      <SpecialBonusWheel bonus={specialBonus || null} onFinish={onFinishSpecialBonus || (() => {})} />

      {/* Winner Modal */}
      {activeWinner && (
        <WinnerModal
          winner={activeWinner}
          onClose={onCloseWinnerModal || (() => {})}
          onEliminate={onEliminateWinner || (() => {})}
          onKeep={onKeepWinner || (() => {})}
        />
      )}
    </div>
  );
};
