import React from 'react';
import { Gift, Heart, UserPlus, Radio, Activity } from 'lucide-react';
import { getFallbackAvatar } from '../utils/avatars';

/** Accepts both the current FeedEvent shape and the older { type, data } shape. */
type FeedItem = Record<string, any> | null | undefined;
interface RecentEventsFeedProps { events?: FeedItem[] }

export const RecentEventsFeed: React.FC<RecentEventsFeedProps> = ({ events = [] }) => {
  const safeEvents = Array.isArray(events) ? events.filter(Boolean).slice(0, 30) : [];

  return (
    <div className="flex flex-col h-full bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <h3 className="font-extrabold text-white text-base">Canlı Yayın Akışı</h3>
        </div>
        <span className="text-xs text-slate-500">{safeEvents.length} Son Olay</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[380px] custom-scrollbar">
        {safeEvents.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">TikTok canlı yayın olayları burada akacak</div>
        ) : safeEvents.map((item, idx) => {
          // App.tsx stores simple FeedEvent objects (username/text/avatar), while some
          // older code paths may still pass { type, data, rightsAdded }.
          const data = item?.data && typeof item.data === 'object' ? item.data : item;
          const type = String(item?.type || data?.type || 'system').toLowerCase();
          const username = String(data?.nickname || data?.displayName || data?.username || item?.username || 'İzleyici');
          const text = String(item?.text || data?.text || (type === 'follow' ? 'yayını takip etti' : type === 'like' ? 'beğeni gönderdi' : type === 'gift' ? (data?.giftName || 'hediye gönderdi') : ''));
          const avatar = data?.profilePictureUrl || data?.avatarUrl || data?.avatar || item?.avatar || getFallbackAvatar(username);
          const rightsAdded = Number(item?.rightsAdded || 0);
          const Icon = type === 'gift' ? Gift : type === 'like' ? Heart : type === 'follow' ? UserPlus : Activity;
          const iconClass = type === 'gift' ? 'text-rose-400' : type === 'like' ? 'text-pink-400' : type === 'follow' ? 'text-blue-400' : 'text-slate-400';
          const panelClass = type === 'gift' ? 'bg-rose-950/20 border-rose-900/30' : type === 'like' ? 'bg-pink-950/20 border-pink-900/30' : type === 'follow' ? 'bg-blue-950/20 border-blue-900/30' : 'bg-slate-800/40 border-slate-700/50';
          return (
            <div key={`${String(item?.id || data?.id || type)}-${idx}`} className={`flex items-center justify-between gap-2 p-2.5 border rounded-xl text-xs ${panelClass}`}>
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={avatar}
                  alt={username}
                  referrerPolicy="no-referrer"
                  onError={(event) => {
                    const img = event.currentTarget;
                    img.onerror = null;
                    img.src = getFallbackAvatar(username);
                  }}
                  className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                />
                <div className="min-w-0 truncate">
                  <span className="font-bold text-white">{username}</span>{' '}
                  <span className="text-slate-300">{text}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-1">
                <Icon className={`w-3.5 h-3.5 ${iconClass}`} />
                {rightsAdded > 0 && <span className="px-1.5 py-0.5 bg-white/10 text-white font-extrabold rounded">+{rightsAdded} Hak</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
