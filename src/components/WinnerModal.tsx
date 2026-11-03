import React, { useEffect } from 'react';
import { Participant } from '../types';
import { Trophy, UserMinus, RotateCw, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { getFallbackAvatar } from '../utils/avatars';

interface WinnerModalProps {
  winner: Participant | null;
  onClose: () => void;
  onEliminate: (winnerId: string) => void;
  onKeep: () => void;
}

export const WinnerModal: React.FC<WinnerModalProps> = ({
  winner,
  onClose,
  onEliminate,
  onKeep,
}) => {
  useEffect(() => {
    if (!winner) return;

    try {
      confetti({
        particleCount: 120,
        spread: 120,
        origin: { y: 0.5 },
        colors: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'],
      });
    } catch {
      // ignore
    }
  }, [winner]);

  if (!winner) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative max-w-md w-full bg-slate-900 border-2 border-rose-500/80 rounded-3xl p-6 text-center shadow-[0_0_60px_rgba(244,63,94,0.4)]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Trophy Header */}
        <div className="inline-flex items-center justify-center p-4 bg-gradient-to-tr from-rose-500 to-amber-500 rounded-full shadow-lg mb-4 text-white">
          <Trophy className="w-10 h-10" />
        </div>

        <h3 className="text-sm uppercase tracking-widest font-extrabold text-rose-400 mb-1">
          Tebrikler Kazanan Belirlendi!
        </h3>

        {/* Winner Avatar */}
        <div className="relative inline-block my-3">
          <img
            src={winner.avatarUrl || winner.avatar || getFallbackAvatar(winner.username)}
            alt={winner.nickname}
            className="w-24 h-24 rounded-full object-cover border-4 border-rose-500 shadow-xl bg-slate-800 mx-auto"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80';
            }}
          />
        </div>

        {/* Winner Names */}
        <div className="text-2xl font-extrabold text-white mb-1">
          {winner.nickname || winner.username}
        </div>
        <div className="text-sm text-slate-400 mb-4">
          @{winner.username} • <span className="text-rose-400 font-bold">{winner.rights} Hak</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => onEliminate(winner.id)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-rose-900/40 transition active:scale-95 cursor-pointer"
          >
            <UserMinus className="w-4 h-4" />
            Kazananı Çıkar
          </button>
          <button
            onClick={onKeep}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl font-bold text-sm border border-slate-700 transition active:scale-95 cursor-pointer"
          >
            <RotateCw className="w-4 h-4" />
            Tut / Devam Et
          </button>
        </div>
      </div>
    </div>
  );
};
