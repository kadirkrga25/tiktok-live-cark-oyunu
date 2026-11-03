import React, { useEffect, useRef, useState } from 'react';

type BonusData = {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  giftName: string;
  rights: number;
};

interface SpecialBonusWheelProps {
  bonus: BonusData | null;
  onFinish: () => void;
}

export const SpecialBonusWheel: React.FC<SpecialBonusWheelProps> = ({ bonus, onFinish }) => {
  const [rolling, setRolling] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const completedRef = useRef(false);

  useEffect(() => {
    if (!bonus) {
      setRolling(false);
      setResultVisible(false);
      completedRef.current = false;
      return;
    }

    completedRef.current = false;
    setResultVisible(false);
    const frame = window.requestAnimationFrame(() => setRolling(true));
    const fallback = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onFinish();
      }
    }, 5200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(fallback);
    };
  }, [bonus?.id]);

  if (!bonus) return null;

  const rowHeight = 64;
  const targetIndex = 32;
  const numbers = Array.from({ length: targetIndex }, (_, index) => (index % 8) + 1);
  numbers.push(bonus.rights);

  const finish = () => {
    if (completedRef.current || resultVisible) return;
    setResultVisible(true);
    window.setTimeout(() => {
      if (completedRef.current) return;
      completedRef.current = true;
      onFinish();
    }, 1100);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4">
      <div className="w-full max-w-sm rounded-3xl border border-amber-300/40 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 p-6 text-center shadow-[0_0_80px_rgba(245,158,11,0.25)]">
        <div className="text-xs font-black uppercase tracking-[0.25em] text-amber-300">ÖZEL HEDİYE BONUSU</div>
        <h2 className="mt-2 text-2xl font-black text-white">Bonus Hak Çarkı</h2>
        <p className="mt-1 text-sm text-slate-300">{bonus.giftName} gönderen</p>

        <div className="mt-5 flex items-center justify-center gap-3">
          {bonus.avatar ? (
            <img src={bonus.avatar} alt="" className="h-11 w-11 rounded-full border-2 border-amber-300 object-cover" />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-400 text-lg font-black text-slate-950">
              {(bonus.displayName || bonus.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="text-left">
            <div className="font-bold text-white">{bonus.displayName}</div>
            <div className="text-xs text-slate-400">@{bonus.username}</div>
          </div>
        </div>

        <div className="relative mx-auto mt-6 h-[76px] w-36 overflow-hidden rounded-2xl border-2 border-amber-300 bg-slate-950 shadow-inner">
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-4 bg-gradient-to-b from-slate-950 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-4 bg-gradient-to-t from-slate-950 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-1/2 z-20 h-16 -translate-y-1/2 border-y-2 border-amber-300/80 bg-amber-300/10" />
          <div
            onTransitionEnd={finish}
            className="relative flex flex-col items-center"
            style={{
              transform: rolling ? `translateY(${38 - targetIndex * rowHeight}px)` : 'translateY(38px)',
              transition: rolling ? 'transform 2.8s cubic-bezier(0.12, 0.72, 0.08, 1)' : 'none',
            }}
          >
            {numbers.map((number, index) => (
              <div
                key={`${index}-${number}`}
                className={`flex h-16 w-full flex-shrink-0 items-center justify-center font-mono text-4xl font-black ${
                  index === targetIndex ? 'text-amber-300' : 'text-slate-500'
                }`}
              >
                {number}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 text-xs font-semibold text-slate-400">1 ile 8 arasında şansına çıkan hak</div>
        <div className="mt-2 text-sm font-black text-amber-300">
          {resultVisible ? `🎉 +${bonus.rights} HAK KAZANDI!` : 'ÇARK DÖNÜYOR...'}
        </div>
      </div>
    </div>
  );
};
