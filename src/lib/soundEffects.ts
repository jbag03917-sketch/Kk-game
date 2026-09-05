/**
 * Web Audio API 기반 사운드 이펙트 & 저작권 프리 BGM 신디사이저 엔진
 * 100% 브라우저 내장 오디오 합성(Web Audio API)으로 외부 음원 저작권 문제 없이
 * 반응성 높은 효과음과 경쾌한 배경음악(BGM)을 실시간 생성합니다. (CC0 1.0 Universal)
 */

export interface SoundSettings {
  masterVolume: number; // 0.0 ~ 1.0
  bgmVolume: number;    // 0.0 ~ 1.0
  sfxVolume: number;    // 0.0 ~ 1.0
  isMuted: boolean;
  isBgmEnabled: boolean;
  isSfxEnabled: boolean;
}

const STORAGE_KEY = 'kkeutitgi_sound_settings_v2';

const DEFAULT_SETTINGS: SoundSettings = {
  masterVolume: 1.0,
  bgmVolume: 0.5,
  sfxVolume: 0.8,
  isMuted: false,
  isBgmEnabled: true,
  isSfxEnabled: true,
};

type BgmMode = 'lobby' | 'game';
type SoundChangeListener = (settings: SoundSettings) => void;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private settings: SoundSettings = { ...DEFAULT_SETTINGS };
  private bgmMode: BgmMode = 'lobby';
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;
  private bgmNextNoteTime: number = 0;
  private bgmMasterGain: GainNode | null = null;
  private sfxMasterGain: GainNode | null = null;
  private listeners: Set<SoundChangeListener> = new Set();

  constructor() {
    this.loadSettings();
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          masterVolume: typeof parsed.masterVolume === 'number' ? Math.max(0, Math.min(1, parsed.masterVolume)) : DEFAULT_SETTINGS.masterVolume,
          bgmVolume: typeof parsed.bgmVolume === 'number' ? Math.max(0, Math.min(1, parsed.bgmVolume)) : DEFAULT_SETTINGS.bgmVolume,
          sfxVolume: typeof parsed.sfxVolume === 'number' ? Math.max(0, Math.min(1, parsed.sfxVolume)) : DEFAULT_SETTINGS.sfxVolume,
          isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_SETTINGS.isMuted,
          isBgmEnabled: typeof parsed.isBgmEnabled === 'boolean' ? parsed.isBgmEnabled : DEFAULT_SETTINGS.isBgmEnabled,
          isSfxEnabled: typeof parsed.isSfxEnabled === 'boolean' ? parsed.isSfxEnabled : DEFAULT_SETTINGS.isSfxEnabled,
        };
      }
    } catch {
      this.settings = { ...DEFAULT_SETTINGS };
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // ignore
    }
    this.notifyListeners();
  }

  public subscribe(listener: SoundChangeListener): () => void {
    this.listeners.add(listener);
    listener({ ...this.settings });
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners() {
    const current = { ...this.settings };
    this.listeners.forEach((fn) => fn(current));
  }

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.updateGains();
  }

  private updateGains() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // BGM effective volume (base scaled factor ~0.24 for comfortable ambient listening)
    const effectiveBgm =
      this.settings.isMuted || !this.settings.isBgmEnabled
        ? 0
        : this.settings.masterVolume * this.settings.bgmVolume * 0.24;

    if (!this.bgmMasterGain) {
      this.bgmMasterGain = this.ctx.createGain();
      this.bgmMasterGain.connect(this.ctx.destination);
    }
    this.bgmMasterGain.gain.setValueAtTime(effectiveBgm, now);

    // SFX effective volume
    const effectiveSfx =
      this.settings.isMuted || !this.settings.isSfxEnabled
        ? 0
        : this.settings.masterVolume * this.settings.sfxVolume;

    if (!this.sfxMasterGain) {
      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.connect(this.ctx.destination);
    }
    this.sfxMasterGain.gain.setValueAtTime(effectiveSfx, now);
  }

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public setMasterVolume(vol: number) {
    this.settings.masterVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
    this.saveSettings();
  }

  public setBgmVolume(vol: number) {
    this.settings.bgmVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
    this.saveSettings();
  }

  public setSfxVolume(vol: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, vol));
    this.updateGains();
    this.saveSettings();
  }

  public setMuted(muted: boolean) {
    this.settings.isMuted = muted;
    this.updateGains();
    this.saveSettings();
  }

  public getIsMuted(): boolean {
    return this.settings.isMuted;
  }

  public setBgmEnabled(enabled: boolean) {
    this.settings.isBgmEnabled = enabled;
    this.updateGains();
    this.saveSettings();
    if (enabled && !this.bgmTimer) {
      this.startBGM(this.bgmMode);
    } else if (!enabled && this.bgmTimer) {
      this.stopBGM();
    }
  }

  public getIsBgmEnabled(): boolean {
    return this.settings.isBgmEnabled;
  }

  public setSfxEnabled(enabled: boolean) {
    this.settings.isSfxEnabled = enabled;
    this.updateGains();
    this.saveSettings();
  }

  public getIsSfxEnabled(): boolean {
    return this.settings.isSfxEnabled;
  }

  public toggleBGM(): boolean {
    const next = !this.settings.isBgmEnabled;
    this.setBgmEnabled(next);
    return next;
  }

  public toggleMute(): boolean {
    const next = !this.settings.isMuted;
    this.setMuted(next);
    return next;
  }

  // ==========================================
  // 🎵 저작권 프리 BGM 신디사이저 (Lobby & Game)
  // ==========================================

  public startBGM(mode: BgmMode = 'lobby') {
    this.bgmMode = mode;
    this.initCtx();
    if (!this.ctx) return;

    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }

    this.bgmStep = 0;
    this.bgmNextNoteTime = this.ctx.currentTime + 0.05;

    // Scheduler tick every 40ms to schedule ahead
    this.bgmTimer = window.setInterval(() => {
      this.scheduleBgmNotes();
    }, 40);
  }

  public stopBGM() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
    if (this.bgmMasterGain && this.ctx) {
      this.bgmMasterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    }
  }

  // Frequency lookup helper for notes
  private noteFreq(note: string): number {
    const table: Record<string, number> = {
      C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
      C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
      C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
      C6: 1046.5,
      REST: 0,
    };
    return table[note] || 0;
  }

  // Plays a single synthesized tone with ADSR envelope
  private playSynthNote(
    freq: number,
    time: number,
    duration: number,
    type: OscillatorType = 'sine',
    vol: number = 0.15,
    filterFreq?: number
  ) {
    if (!this.ctx || !this.bgmMasterGain || freq <= 0) return;

    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);

    // ADSR Envelope
    noteGain.gain.setValueAtTime(0.0001, time);
    noteGain.gain.linearRampToValueAtTime(vol, time + 0.02);
    noteGain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    if (filterFreq) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(filterFreq, time);
      osc.connect(filter);
      filter.connect(noteGain);
    } else {
      osc.connect(noteGain);
    }

    noteGain.connect(this.bgmMasterGain);
    osc.start(time);
    osc.stop(time + duration);
  }

  // Play a soft rhythmic percussion click/hihat for arcade tempo
  private playPercussion(time: number, isAccent: boolean = false) {
    if (!this.ctx || !this.bgmMasterGain) return;

    const bufferSize = this.ctx.sampleRate * 0.03;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = isAccent ? 'bandpass' : 'highpass';
    filter.frequency.setValueAtTime(isAccent ? 3500 : 7000, time);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(isAccent ? 0.08 : 0.03, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.03);

    whiteNoise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.bgmMasterGain);

    whiteNoise.start(time);
    whiteNoise.stop(time + 0.035);
  }

  private scheduleBgmNotes() {
    if (!this.ctx || this.settings.isMuted || !this.settings.isBgmEnabled) return;

    const scheduleAheadTime = 0.15; // Schedule 150ms ahead

    if (this.bgmMode === 'lobby') {
      // 🌿 LOBBY BGM: Relaxing, melodic, upbeat cafe lounge vibe (108 BPM, 8-measure loop)
      const stepDuration = 60 / 108 / 2; // Eighth note duration ~0.277s
      const totalSteps = 32;

      // Chord / Bass progression: Cmaj -> G/B -> Am -> Em -> F -> C -> Dm -> G
      const bassNotes = [
        'C3', 'REST', 'C4', 'REST', 'B3', 'REST', 'G3', 'REST',
        'A3', 'REST', 'E3', 'REST', 'G3', 'REST', 'E3', 'REST',
        'F3', 'REST', 'C4', 'REST', 'E3', 'REST', 'C3', 'REST',
        'D3', 'REST', 'F3', 'REST', 'G3', 'REST', 'B3', 'REST',
      ];

      const melodyNotes = [
        'E4', 'G4', 'C5', 'E5', 'D5', 'B4', 'G4', 'REST',
        'C5', 'E5', 'A5', 'G5', 'E5', 'D5', 'C5', 'REST',
        'A4', 'C5', 'F5', 'E5', 'D5', 'C5', 'G4', 'REST',
        'F4', 'A4', 'D5', 'C5', 'B4', 'D5', 'C5', 'REST',
      ];

      while (this.bgmNextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        const step = this.bgmStep % totalSteps;
        const time = this.bgmNextNoteTime;

        // Bass Note
        const bass = bassNotes[step];
        if (bass !== 'REST') {
          this.playSynthNote(this.noteFreq(bass), time, stepDuration * 1.8, 'triangle', 0.14, 800);
        }

        // Melody Note
        const melody = melodyNotes[step];
        if (melody !== 'REST') {
          this.playSynthNote(this.noteFreq(melody), time, stepDuration * 0.9, 'sine', 0.12, 2200);
        }

        // Light soft percussive tap on backbeats (2 and 4)
        if (step % 4 === 2) {
          this.playPercussion(time, false);
        }

        this.bgmNextNoteTime += stepDuration;
        this.bgmStep++;
      }
    } else {
      // ⚡ GAME BGM: Upbeat, driving, fun arcade chiptune beat (132 BPM, 16-step high-energy loop)
      const stepDuration = 60 / 132 / 2; // Sixteenth / eighth step ~0.227s
      const totalSteps = 32;

      // Driving Bassline (Am - F - C - G energetic pulse)
      const bassNotes = [
        'A3', 'A3', 'E3', 'A3', 'F3', 'F3', 'C4', 'F3',
        'C3', 'C3', 'G3', 'C4', 'G3', 'G3', 'D4', 'G3',
        'A3', 'C4', 'E4', 'A3', 'F3', 'A3', 'C4', 'F3',
        'C3', 'E3', 'G3', 'C4', 'G3', 'B3', 'D4', 'G3',
      ];

      // Catchy 8-bit Arcade Game Melody
      const leadNotes = [
        'E5', 'REST', 'A5', 'E5', 'F5', 'REST', 'A5', 'F5',
        'G5', 'E5', 'C5', 'E5', 'D5', 'REST', 'B4', 'G4',
        'A4', 'C5', 'E5', 'A5', 'C6', 'B5', 'A5', 'G5',
        'A5', 'F5', 'D5', 'F5', 'G5', 'F5', 'E5', 'D5',
      ];

      while (this.bgmNextNoteTime < this.ctx.currentTime + scheduleAheadTime) {
        const step = this.bgmStep % totalSteps;
        const time = this.bgmNextNoteTime;

        // Bass Synth
        const bass = bassNotes[step];
        if (bass !== 'REST') {
          this.playSynthNote(this.noteFreq(bass), time, stepDuration * 0.85, 'sawtooth', 0.12, 1200);
        }

        // Lead Melody Synth
        const lead = leadNotes[step];
        if (lead !== 'REST') {
          this.playSynthNote(this.noteFreq(lead), time, stepDuration * 0.75, 'square', 0.09, 3200);
        }

        // Rhythmic Arcade Percussion
        if (step % 2 === 0) {
          this.playPercussion(time, step % 4 === 0);
        }

        this.bgmNextNoteTime += stepDuration;
        this.bgmStep++;
      }
    }
  }

  private connectSfx(gain: GainNode) {
    if (!this.ctx) return;
    if (!this.sfxMasterGain) {
      this.sfxMasterGain = this.ctx.createGain();
      this.sfxMasterGain.connect(this.ctx.destination);
      this.updateGains();
    }
    gain.connect(this.sfxMasterGain);
  }

  // ==========================================
  // 🔔 효과음 (SFX)
  // ==========================================

  // 1. 단어 정답 효과음 (경쾌한 벨소리)
  public playCorrect() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.1); // G5

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(659.25, now + 0.05); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.5, now + 0.18); // C6

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    this.connectSfx(gain);

    osc1.start(now);
    osc2.start(now + 0.05);
    osc1.stop(now + 0.35);
    osc2.stop(now + 0.35);
  }

  // 2. 단어 오답 / 탈락 효과음 (낮은 비프음)
  public playWrong() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now); // A3
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3); // A2

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    this.connectSfx(gain);

    osc.start(now);
    osc.stop(now + 0.35);
  }

  // 3. 턴 카운트다운 째깍 소리 (5초 중 마지막 2초 긴박감)
  public playTick(urgent: boolean = false) {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = urgent ? 'square' : 'sine';
    osc.frequency.setValueAtTime(urgent ? 880 : 440, now);

    gain.gain.setValueAtTime(urgent ? 0.15 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    this.connectSfx(gain);

    osc.start(now);
    osc.stop(now + 0.05);
  }

  // 4. 게임 시작 / 버튼 팝 소리
  public playPop() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(gain);
    this.connectSfx(gain);

    osc.start(now);
    osc.stop(now + 0.1);
  }

  // 4-1. 플레이어 입장 알림음 (도-미-솔 상승 화음)
  public playJoin() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.07;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      this.connectSfx(gain);

      osc.start(now);
      osc.stop(now + 0.2);
    });
  }

  // 4-2. 게임 시작 효과음
  public playGameStart() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.08;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      this.connectSfx(gain);

      osc.start(now);
      osc.stop(now + 0.3);
    });
  }

  // 4-3. 시간 초과 / 턴 경과 효과음
  public playTimeout() {
    this.playWrong();
  }

  // 5. 최종 승리 팡파르
  public playVictory() {
    if (this.settings.isMuted || !this.settings.isSfxEnabled) return;
    this.initCtx();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const now = this.ctx!.currentTime + idx * 0.12;
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc.connect(gain);
      this.connectSfx(gain);

      osc.start(now);
      osc.stop(now + 0.4);
    });
  }
}

export const sounds = new SoundEngine();
