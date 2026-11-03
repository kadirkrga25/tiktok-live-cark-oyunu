import React, { useEffect, useState } from 'react';
import { BigGiftCelebration } from '../types';
import { Sparkles, Crown, Coins } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getFallbackAvatar } from '../utils/avatars';

interface BigGiftAlertProps {
  alert: BigGiftCelebration | null;
  onDismiss?: () => void;
  onClose?: () => void;
}

export const BigGiftAlert: React.FC<BigGiftAlertProps> = ({ alert, onDismiss, onClose }) => {
  const [scale, setScale] = useState<number>(0.2);
  const [opacity, setOpacity] = useState<number>(0);

  const handleClose = () => {
    if (onDismiss) onDismiss();
    if (onClose) onClose();
  };

  useEffect(() => {
    if (!alert) return;

    // Trigger celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#f43f5e', '#ec4899', '#ffffff'],
      });
    } catch {
      // ignore
    }

    // "gelsin büyüsün büyüsün" zoom animation
    const step1 = setTimeout(() => {
      setOpacity(1);
      setScale(1.15); // Grow past 1.0
    }, 40);

    const step2 = setTimeout(() => {
      setScale(1.0); // Settle smoothly
    }, 380);

    // Auto dismiss after 4.5s
    const dismissTimer = setTimeout(() => {
      setOpacity(0);
      setScale(0.8);
      setTimeout(handleClose, 350);
    }, 4500);

    return () => {
      clearTimeout(step1);
      clearTimeout(step2);
      clearTimeout(dismissTimer);
    };
  }, [alert]);

  if (!alert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md pointer-events-none transition-opacity duration-300">
      <div
        className="relative max-w-lg w-full bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950/95 border-2 border-amber-400/80 rounded-3xl p-8 text-center shadow-[0_0_80px_rgba(245,158,11,0.5)] transform transition-all duration-500 ease-out pointer-events-auto"
        style={{
          transform: `scale(${scale})`,
          opacity: opacity,
        }}
      >
        {/* Crown Icon */}
        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-amber-400 text-slate-950 p-3 rounded-full shadow-lg border-2 border-amber-200 animate-bounce">
          <Crown className="w-8 h-8 fill-slate-950" />
        </div>

        {/* Ambient Glow */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 to-rose-500 rounded-3xl blur-xl opacity-30 -z-10 animate-pulse" />

        {/* Profile Picture with Golden Aura ("gelsin büyüsün") */}
        <div className="relative inline-block mt-4 mb-4">
          <div className="w-32 h-32 rounded-full p-1.5 bg-gradient-to-tr from-amber-400 via-yellow-200 to-rose-500 shadow-[0_0_40px_rgba(251,191,36,0.8)]">
            <img
              src={alert.avatarUrl || alert.avatar || getFallbackAvatar(alert.username)}
              alt={alert.displayName || alert.nickname || alert.username}
              className="w-full h-full rounded-full object-cover border-4 border-slate-900 bg-slate-800"
              onError={(e) => {
                (e.target as HTMLImageElement).onerror = null;
                (e.target as HTMLImageElement).src = getFallbackAvatar(alert.username);
              }}
            />
          </div>
          <span className="absolute bottom-0 right-0 text-3xl bg-slate-900/90 rounded-full p-1 border-2 border-amber-400 shadow">
            {alert.giftIcon || '🎁'}
          </span>
        </div>

        {/* Title Requirement: "KESENE BEREKETLER OLSUN!" */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
          <h2 className="text-3xl md:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-500 tracking-wide uppercase">
            KESENE BEREKETLER OLSUN!
          </h2>
          <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
        </div>

        <p className="text-amber-200/90 text-sm font-medium mb-4">
          Canlı yayına muhteşem desteğin için teşekkürler!
        </p>

        {/* User and Gift Details */}
        <div className="bg-slate-900/80 border border-amber-400/30 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="text-left">
            <div className="text-lg font-bold text-white leading-tight">
              {alert.displayName || alert.nickname || alert.username}
            </div>
            <div className="text-xs text-slate-400">@{alert.username}</div>
          </div>
          <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-400/40">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-extrabold text-amber-300">
              {(alert.diamonds || alert.totalCoins || 0).toLocaleString('tr-TR')} Jeton
            </span>
          </div>
        </div>

        <div className="text-slate-300 text-sm font-medium">
          Hediye: <span className="text-white font-bold">{alert.giftName}</span>
        </div>
      </div>
    </div>
  );
};

export const BigGiftCelebrationOverlay = BigGiftAlert;
export default BigGiftAlert;
