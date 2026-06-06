import { CONFIG } from './config.js';

export class SoundManager {
  constructor() {
    this._ctx         = null;
    this._sfxGain     = null;
    this._musicGain   = null;
    this._initialized = false;

    this._sfxEnabled   = true;
    this._musicEnabled = true;
    this._sfxVolume    = 0.5;
    this._musicVolume  = 0.25;

    this._files      = {};
    this._musicAudio = null;
  }

  init() {
    if (this._initialized) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this._ctx = new AC();
        const master = this._ctx.createGain();
        master.gain.value = 1;
        master.connect(this._ctx.destination);

        this._sfxGain = this._ctx.createGain();
        this._sfxGain.gain.value = this._sfxVolume;
        this._sfxGain.connect(master);

        this._musicGain = this._ctx.createGain();
        this._musicGain.gain.value = this._musicVolume;
        this._musicGain.connect(master);
      }
    } catch (e) {
      console.warn('Web Audio API unavailable:', e);
    }

    const unlock = () => {
      if (this._ctx?.state === 'suspended') this._ctx.resume();
      document.removeEventListener('keydown', unlock, true);
      document.removeEventListener('click', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
    };
    document.addEventListener('keydown', unlock, true);
    document.addEventListener('click', unlock, true);
    document.addEventListener('touchstart', unlock, true);

    this._loadConfigFiles();
    this._initialized = true;
  }

  _loadConfigFiles() {
    const sounds = CONFIG.SOUNDS || {};
    for (const key of ['type', 'correct', 'incorrect', 'missed', 'powerup', 'combo', 'gameOver']) {
      if (sounds[key]) this._files[key] = this._makeAudio(sounds[key]);
    }
    if (sounds.music) {
      this._musicAudio = this._makeAudio(sounds.music, true);
      this._musicAudio.volume = this._musicVolume;
    }
  }

  _makeAudio(src, loop = false) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.loop    = loop;
    audio.onerror = (e) => console.error(`[SoundManager] Failed to load "${src}" —`, e.type, audio.error);
    return audio;
  }

  _resumeCtx() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  play(name) {
    if (!this._sfxEnabled) return;
    const audio = this._files[name];
    if (!audio) return;
    if (name === 'type') {
      audio.volume = this._sfxVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      const clone = audio.cloneNode();
      clone.volume = this._sfxVolume;
      clone.play().catch(() => {});
    }
  }

  startMusic() {
    if (!this._musicEnabled || !this._musicAudio) return;
    this._musicAudio.volume = this._musicVolume;
    this._musicAudio.play().catch(err => console.error('[SoundManager] startMusic failed:', err));
  }

  stopMusic() {
    if (!this._musicAudio) return;
    this._musicAudio.pause();
    this._musicAudio.currentTime = 0;
  }

  setSfxEnabled(val)  { this._sfxEnabled = val; }

  setMusicEnabled(val) {
    this._musicEnabled = val;
    if (!val) this.stopMusic();
    else this.startMusic();
  }

  setSfxVolume(v) {
    this._sfxVolume = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  setMusicVolume(v) {
    this._musicVolume = v;
    if (this._musicGain) this._musicGain.gain.value = v;
    if (this._musicAudio) this._musicAudio.volume = v;
  }
}
