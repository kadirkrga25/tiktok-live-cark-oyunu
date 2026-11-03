import React, { useEffect, useRef, useState } from 'react';
import { Participant } from '../types';
import { soundEngine } from '../utils/audio';
import { getFallbackAvatar } from '../utils/avatars';

interface WheelCanvasProps {
  participants: Participant[];
  isSpinning: boolean;
  targetAngle: number;
  currentAngle: number;
  onSpinFinished: (winner: Participant) => void;
  prizeName: string;
  size?: number;
  showLoupe?: boolean;
  soundEnabled?: boolean;
  spinVolume?: number;
}

export const WheelCanvas: React.FC<WheelCanvasProps> = ({
  participants,
  isSpinning,
  currentAngle,
  prizeName,
  size = 640,
  showLoupe = true,
  soundEnabled = true,
  spinVolume = 60,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const loupeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeCandidate, setActiveCandidate] = useState<Participant | null>(null);
  const lastSectorIdxRef = useRef<number>(-1);

  // Avatar image cache to prevent re-instantiation and flicker during wheel rotation
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [, setImagesLoadedVersion] = useState<number>(0);

  // Active participants with rights > 0 and not eliminated
  const activeList = participants.filter((p) => !p.isEliminated && p.rights > 0);
  const totalSlots = activeList.reduce((sum, p) => sum + p.rights, 0);

  // Preload and cache avatars for all participants
  useEffect(() => {
    let active = true;
    let newLoaded = false;

    activeList.forEach((p) => {
      const avatarUrl = p.avatar || getFallbackAvatar(p.username);
      if (!avatarUrl || imageCacheRef.current.has(avatarUrl)) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = avatarUrl;

      img.onload = () => {
        if (!active) return;
        imageCacheRef.current.set(avatarUrl, img);
        newLoaded = true;
      };

      img.onerror = () => {
        if (!active) return;
        // Fallback without crossOrigin in case host rejects CORS header
        const retryImg = new Image();
        retryImg.src = avatarUrl;
        retryImg.onload = () => {
          if (!active) return;
          imageCacheRef.current.set(avatarUrl, retryImg);
          newLoaded = true;
        };
      };
    });

    const timer = setInterval(() => {
      if (newLoaded && active) {
        newLoaded = false;
        setImagesLoadedVersion((v) => v + 1);
      }
    }, 250);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [participants]);

  // Determine which participant is currently under the top needle pointer (-PI/2)
  const getSelectedParticipantAtAngle = (angle: number): { participant: Participant | null; index: number } => {
    if (activeList.length === 0 || totalSlots === 0) return { participant: null, index: -1 };

    // Pointer is located at the top: angle = -PI/2
    const normalized = (((-Math.PI / 2 - angle) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    let cumulative = 0;

    for (let i = 0; i < activeList.length; i++) {
      const p = activeList[i];
      const sliceSize = (p.rights / totalSlots) * Math.PI * 2;
      if (normalized >= cumulative && normalized < cumulative + sliceSize) {
        return { participant: p, index: i };
      }
      cumulative += sliceSize;
    }
    return { participant: activeList[0], index: 0 };
  };

  // Render main canvas and loupe
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = size;
    const H = size;
    const cx = W / 2;
    const cy = H / 2;
    const radius = W / 2 - 14;

    ctx.clearRect(0, 0, W, H);

    // Empty state
    if (activeList.length === 0 || totalSlots === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#14141e';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.stroke();

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 16px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Katılımcı Bekleniyor...', cx, cy);
      return;
    }

    // Outer glow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(254, 44, 85, 0.35)';
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(254, 44, 85, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    let startAngle = currentAngle - Math.PI / 2;

    // Draw slices
    activeList.forEach((p) => {
      const sliceAngle = (p.rights / totalSlots) * Math.PI * 2;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + sliceAngle);
      ctx.closePath();

      // Sector fill
      ctx.fillStyle = p.color;
      ctx.fill();

      // Sector border
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.stroke();

      // Mid-angle of the slice for positioning elements
      const midAngle = startAngle + sliceAngle / 2;

      // 1. PROFIL FOTOĞRAFI (Avatar) Çizimi (Kullanıcı Talebi: Profil fotoğrafları çarkta gözüksün)
      if (sliceAngle > 0.035) {
        const avatarDist = radius * 0.72;
        const ax = cx + Math.cos(midAngle) * avatarDist;
        const ay = cy + Math.sin(midAngle) * avatarDist;

        // Calculate responsive avatar size based on slice arc width
        const arcWidth = avatarDist * sliceAngle;
        const avatarSize = Math.max(16, Math.min(36, arcWidth * 0.8));
        const avatarRadius = avatarSize / 2;

        const avatarUrl = p.avatar || getFallbackAvatar(p.username);
        const cachedImg = imageCacheRef.current.get(avatarUrl);

        ctx.save();

        // White border ring with subtle dark shadow
        ctx.beginPath();
        ctx.arc(ax, ay, avatarRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();

        // Clip circular avatar image
        ctx.beginPath();
        ctx.arc(ax, ay, avatarRadius, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();

        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          try {
            ctx.drawImage(cachedImg, ax - avatarRadius, ay - avatarRadius, avatarSize, avatarSize);
          } catch {
            // In case cross-origin issue prevents drawImage, draw initial badge
            ctx.fillStyle = p.color || '#ec4899';
            ctx.fillRect(ax - avatarRadius, ay - avatarRadius, avatarSize, avatarSize);
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(9, Math.floor(avatarRadius * 1.1))}px Outfit, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((p.displayName || p.username || '?').charAt(0).toUpperCase(), ax, ay);
          }
        } else {
          // Stylish fallback initial badge while image is preloading
          ctx.fillStyle = p.color || '#ec4899';
          ctx.fillRect(ax - avatarRadius, ay - avatarRadius, avatarSize, avatarSize);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(9, Math.floor(avatarRadius * 1.1))}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText((p.displayName || p.username || '?').charAt(0).toUpperCase(), ax, ay);
        }

        ctx.restore();

        // 2. KULLANICI ADI & HAK ROZETİ (Yüksek Kontrastlı Koyu Zeminli Hap)
        if (sliceAngle > 0.05) {
          ctx.save();
          const textDist = radius * 0.44;
          const tx = cx + Math.cos(midAngle) * textDist;
          const ty = cy + Math.sin(midAngle) * textDist;

          ctx.translate(tx, ty);

          // Dynamic readable font size
          const fontSize = Math.max(9, Math.min(13, 240 / Math.max(activeList.length, 1)));
          ctx.font = `700 ${fontSize}px Outfit, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          const displayName = p.displayName || p.username;
          const shortName = displayName.length > 9 ? displayName.slice(0, 8) + '…' : displayName;
          const labelText = p.rights > 1 ? `${shortName} (${p.rights})` : shortName;

          // Semi-transparent dark pill background for ultra-crisp readability
          const textWidth = ctx.measureText(labelText).width;
          ctx.fillStyle = 'rgba(10, 10, 18, 0.75)';
          ctx.beginPath();
          ctx.roundRect(-textWidth / 2 - 4, -fontSize / 2 - 3, textWidth + 8, fontSize + 6, 4);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.fillText(labelText, 0, 0);

          ctx.restore();
        }
      }

      startAngle += sliceAngle;
    });

    // Outer wheel metallic rim
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center Hub Outer Ring
    ctx.beginPath();
    ctx.arc(cx, cy, 28, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f59e0b';
    ctx.stroke();

    // Inner center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 12, 0, Math.PI * 2);
    ctx.fillStyle = '#fe2c55';
    ctx.fill();

    // Sector tick sound & active candidate detection
    const currentPick = getSelectedParticipantAtAngle(currentAngle);
    if (currentPick.index !== -1 && currentPick.index !== lastSectorIdxRef.current) {
      lastSectorIdxRef.current = currentPick.index;
      if (soundEnabled && isSpinning) {
        soundManager.playSectorTick(0.8, (spinVolume || 60) / 100);
      }
      if (currentPick.participant) {
        setActiveCandidate(currentPick.participant);
      }
    }

    // Render Loupe (Magnifying glass preview of needle contact area)
    if (showLoupe && loupeCanvasRef.current) {
      const loupe = loupeCanvasRef.current;
      const lctx = loupe.getContext('2d');
      if (lctx) {
        const lw = loupe.width;
        const lh = loupe.height;
        lctx.clearRect(0, 0, lw, lh);

        // Circular clipping
        lctx.save();
        lctx.beginPath();
        lctx.arc(lw / 2, lh / 2, lw / 2 - 2, 0, Math.PI * 2);
        lctx.clip();

        // Draw zoomed view of the top edge where pointer touches
        const zoomFactor = 2.4;
        const srcW = W / zoomFactor;
        const srcH = H / zoomFactor;
        const srcX = cx - srcW / 2;
        const srcY = 12 - srcH / 8; // Near the top pointer

        try {
          lctx.drawImage(canvas, srcX, srcY, srcW, srcH, 0, 0, lw, lh);
        } catch {
          // In case canvas is tainted by external images, skip image draw
        }
        lctx.restore();

        // Loupe crosshair and border
        lctx.beginPath();
        lctx.moveTo(lw / 2, 0);
        lctx.lineTo(lw / 2, lh);
        lctx.strokeStyle = '#fe2c55';
        lctx.lineWidth = 2;
        lctx.stroke();

        lctx.beginPath();
        lctx.arc(lw / 2, lh / 2, lw / 2 - 2, 0, Math.PI * 2);
        lctx.strokeStyle = 'rgba(254, 44, 85, 0.85)';
        lctx.lineWidth = 3;
        lctx.stroke();
      }
    }
  }, [currentAngle, participants, size, showLoupe, isSpinning, soundEnabled, spinVolume]);

  return (
    <div className="relative flex flex-col items-center select-none">
      {/* Loupe / Magnifier overlay with Candidate Profile Picture */}
      {showLoupe && activeList.length > 1 && (
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 flex flex-col items-center z-30 pointer-events-none transition-all">
          <div className="relative w-28 h-28 rounded-full border-2 border-pink-500 shadow-[0_0_20px_rgba(254,44,85,0.4)] overflow-hidden bg-black/90">
            <canvas ref={loupeCanvasRef} width={112} height={112} className="w-full h-full" />
          </div>
          {activeCandidate && (
            <div className="mt-1 px-3 py-1 rounded-full bg-slate-900/95 border border-pink-500/50 text-white font-bold text-xs tracking-wide shadow-xl whitespace-nowrap max-w-[240px] flex items-center gap-2">
              <img
                src={activeCandidate.avatar || getFallbackAvatar(activeCandidate.username)}
                alt=""
                className="w-5 h-5 rounded-full object-cover border border-pink-400 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="truncate text-pink-300 font-extrabold">
                {activeCandidate.displayName || activeCandidate.username}
              </span>
              <span className="text-[10px] bg-pink-500/20 text-pink-300 px-1.5 py-0.5 rounded font-mono font-bold">
                {activeCandidate.rights} Hak
              </span>
            </div>
          )}
        </div>
      )}

      {/* Main Wheel Container */}
      <div className="relative" style={{ width: size, height: size }}>
        {/* Top Pointer Indicator */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center filter drop-shadow-[0_0_10px_rgba(254,44,85,0.8)] pointer-events-none">
          <div className="w-8 h-2.5 bg-gradient-to-r from-pink-500 to-rose-600 rounded-t-sm" />
          <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[28px] border-t-pink-500" />
        </div>

        {/* Wheel Canvas */}
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-full shadow-2xl transition-transform"
          style={{ width: size, height: size }}
        />
      </div>
    </div>
  );
};
