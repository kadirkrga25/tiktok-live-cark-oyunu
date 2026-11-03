// Web Audio API sound synthesizer. All effects are generated locally;
// no remote audio files or autoplay-dependent assets are required.
class SoundEffectsManager {
  private ctx: AudioContext | null = null;
  private spinOscillators: OscillatorNode[] = [];
  private spinGain: GainNode | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx?.state === 'suspended') void this.ctx.resume().catch(() => {});
      return this.ctx;
    } catch {
      return null;
    }
  }

  unlockAudio(): void {
    const ctx = this.getContext();
    if (ctx?.state === 'suspended') void ctx.resume().catch(() => {});
  }

  private tone(frequency: number, duration = 0.12, volume = 0.35, type: OscillatorType = 'sine', delay = 0): void {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const start = ctx.currentTime + delay;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(20, frequency), start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration + 0.02);
      osc.onended = () => { try { osc.disconnect(); gain.disconnect(); } catch {} };
    } catch {
      // Sound is optional; never let an audio failure interrupt the game.
    }
  }

  playTick(volume = 0.5): void {
    this.tone(620, 0.045, Math.min(0.5, volume * 0.35), 'triangle');
  }

  playSectorTick(volume = 0.8, master = 1): void {
    this.tone(720, 0.045, Math.min(0.45, volume * master * 0.35), 'triangle');
  }

  startSpinSound(_customUrl?: string, volume = 0.6): void {
    this.stopSpinSound();
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(75, ctx.currentTime);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(Math.max(0.0001, volume * 0.055), ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.spinOscillators = [osc];
      this.spinGain = gain;
    } catch {
      this.spinOscillators = [];
      this.spinGain = null;
    }
  }

  updateSpinSpeed(progress: number): void {
    const ctx = this.getContext();
    const osc = this.spinOscillators[0];
    if (!ctx || !osc || !this.spinGain) return;
    try {
      const p = Math.max(0, Math.min(1, progress));
      osc.frequency.setTargetAtTime(75 + (1 - p) * 95, ctx.currentTime, 0.08);
      this.spinGain.gain.setTargetAtTime(0.018 + (1 - p) * 0.035, ctx.currentTime, 0.08);
    } catch {}
  }

  stopSpinSound(): void {
    this.spinOscillators.forEach((osc) => {
      try { osc.stop(); osc.disconnect(); } catch {}
    });
    this.spinOscillators = [];
    if (this.spinGain) {
      try { this.spinGain.disconnect(); } catch {}
      this.spinGain = null;
    }
  }

  playWheelStop(volume = 0.7): void {
    this.tone(180, 0.18, volume * 0.45, 'triangle');
    this.tone(520, 0.22, volume * 0.25, 'sine', 0.06);
  }

  playEliminationChime(volume = 0.7): void {
    this.tone(520, 0.12, volume * 0.3, 'sine');
    this.tone(330, 0.2, volume * 0.28, 'sine', 0.12);
  }

  playRightLost(volume = 0.7): void {
    this.tone(440, 0.1, volume * 0.25, 'triangle');
  }

  playWinFanfare(volume = 0.7): void {
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      this.tone(freq, 0.48, volume * 0.22, 'sine', i * 0.12)
    );
  }

  playVictoryFanfare(_customUrl?: string, volume = 0.7): void {
    this.playWinFanfare(volume);
  }

  playBigGiftFanfare(volume = 0.8): void {
    [440, 554.37, 659.25, 783.99, 1046.5].forEach((freq, i) =>
      this.tone(freq, 0.55, volume * 0.16, 'triangle', i * 0.1)
    );
  }

  playBigGiftAlert(volume = 0.8): void {
    this.playBigGiftFanfare(volume);
  }

  playCountdownTick(volume = 0.5): void {
    this.tone(880, 0.08, volume * 0.2, 'sine');
  }
}

export const soundEngine = new SoundEffectsManager();
