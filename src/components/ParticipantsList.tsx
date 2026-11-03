import React, { useState } from 'react';
import { Participant } from '../types';
import { getFallbackAvatar } from '../utils/avatars';
import { Users, Plus, Minus, Trash2, Search, Coins } from 'lucide-react';

interface ParticipantsListProps {
  participants: Participant[];
  maxRightsLimit: number;
  enableMaxLimit: boolean;
  onUpdateRights: (id: string, delta: number) => void;
  onRemoveParticipant: (id: string) => void;
  onClearAll: () => void;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  maxRightsLimit,
  enableMaxLimit,
  onUpdateRights,
  onRemoveParticipant,
  onClearAll,
}) => {
  const [search, setSearch] = useState('');

  const filtered = participants.filter(
    (p) =>
      (p.displayName || p.nickname || '').toLowerCase().includes(search.toLowerCase()) ||
      (p.username || '').toLowerCase().includes(search.toLowerCase())
  );

  const totalRights = participants.reduce((sum, p) => sum + p.rights, 0);

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-rose-500" />
            <h3 className="font-extrabold text-white text-base">Çark Katılımcıları</h3>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
              {participants.length} Kişi • {totalRights} Toplam Hak
            </span>
          </div>
          {participants.length > 0 && (
            <button
              onClick={onClearAll}
              className="text-xs text-rose-400/80 hover:text-rose-300 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Tümünü Temizle
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Katılımcı ara..."
            className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px] custom-scrollbar">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            {participants.length === 0 ? 'Henüz çarka katılan olmadı' : 'Eşleşen katılımcı bulunamadı'}
          </div>
        ) : (
          filtered.map((p) => {
            const isAtMax = enableMaxLimit && p.rights >= maxRightsLimit;
            return (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 bg-slate-950/50 hover:bg-slate-800/50 border border-slate-800/60 rounded-xl transition group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={p.avatarUrl || p.avatar || getFallbackAvatar(p.username)}
                    alt={p.nickname}
                    className="w-9 h-9 rounded-full object-cover border border-slate-700 bg-slate-800 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).onerror = null;
                      (e.target as HTMLImageElement).src = getFallbackAvatar(p.username);
                    }}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate leading-tight">
                      {p.displayName || p.nickname || p.username}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      <span>@{p.username}</span>
                      {(p.totalCoins ?? 0) > 0 && (
                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                          <Coins className="w-3 h-3" />
                          {p.totalCoins}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Rights badge with max indicator */}
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-lg border ${
                      isAtMax
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                    }`}
                    title={isAtMax ? `Maksimum sınıra (${maxRightsLimit}) ulaşıldı` : undefined}
                  >
                    {p.rights} Hak {isAtMax ? '(Maks)' : ''}
                  </span>

                  {/* Manual +/- rights controls */}
                  <div className="flex items-center gap-0.5 opacity-80 group-hover:opacity-100 transition">
                    <button
                      onClick={() => onUpdateRights(p.id, -1)}
                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition cursor-pointer"
                      title="1 Hak Düşür"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onUpdateRights(p.id, 1)}
                      disabled={isAtMax}
                      className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      title="1 Hak Ekle"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveParticipant(p.id)}
                      className="p-1 hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 rounded-md transition cursor-pointer"
                      title="Katılımcıyı Çıkar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
