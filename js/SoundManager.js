import { CONFIG } from './config.js';

export class SoundManager {
  constructor() {
    this._ctx        = null;
    this._sfxGain    = null;
    this._musicGain  = null;
    this._initialized = false;

    this._sfxEnabled   = true;
    this._musicEnabled = true;
    this._sfxVolume    = 0.5;
    this._musicVolume  = 0.25;

    this._files      = {};
    this._musicAudio = null;

    this._ytPlayer      = null;
    this._ytReady       = false;
    this._ytVideoId     = null;
    this._ytVolume      = 50;
    this._ytApiLoaded   = false;
    this._ytPendingPlay = false;
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
    audio.onerror = () => console.warn(`[SoundManager] Failed to load: ${src}`);
    return audio;
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  play(name, param) {
    if (!this._sfxEnabled) return;
    if (this._playFile(name)) return;
    this._synth(name, param);
  }

  _playFile(name) {
    const audio = this._files[name];
    if (!audio) return false;
    if (name === 'type') {
      audio.volume = this._sfxVolume;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } else {
      const clone = audio.cloneNode();
      clone.volume = this._sfxVolume;
      clone.play().catch(() => {});
    }
    return true;
  }

  _tone(freq, type, duration, gain) {
    if (!this._ctx) return;
    this._resume();
    const osc = this._ctx.createOscillator();
    const g   = this._ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, this._ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this._ctx.currentTime + duration);
    osc.connect(g);
    g.connect(this._sfxGain);
    osc.start(this._ctx.currentTime);
    osc.stop(this._ctx.currentTime + duration);
  }

  _synth(name, param) {
    // switch (name) {
    //   case 'type':
    //     this._tone(180 + Math.random() * 380, 'square', 0.04, 0.07);
    //     break;
    //   case 'correct':
    //     [523.25, 659.25, 783.99].forEach((f, i) =>
    //       setTimeout(() => this._tone(f, 'sine', 0.15, 0.28), i * 55));
    //     break;
    //   case 'incorrect':
    //     this._tone(120, 'sawtooth', 0.12, 0.22);
    //     setTimeout(() => this._tone(100, 'sawtooth', 0.10, 0.18), 80);
    //     break;
    //   case 'missed':
    //     this._tone(180, 'triangle', 0.28, 0.32);
    //     setTimeout(() => this._tone(120, 'triangle', 0.28, 0.30), 140);
    //     break;
    //   case 'powerup':
    //     [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    //       setTimeout(() => this._tone(f, 'sine', 0.18, 0.38), i * 45));
    //     break;
    //   case 'combo': {
    //     const base = 300 + (param ?? 1) * 80;
    //     this._tone(base,          'sine', 0.10, 0.28);
    //     setTimeout(() => this._tone(base * 1.25, 'sine', 0.10, 0.28), 50);
    //     break;
    //   }
    //   case 'gameOver':
    //     [392, 349.23, 311.13, 261.63].forEach((f, i) =>
    //       setTimeout(() => this._tone(f, 'sawtooth', 0.5, 0.38), i * 200));
    //     break;
    // }
  }

  startMusic() {
    if (!this._musicEnabled) return;
    if (this._ytVideoId) {
      if (this._ytReady && this._ytPlayer) {
        try { this._ytPlayer.playVideo(); } catch (_) {}
      } else {
        this._ytPendingPlay = true;
        this._loadYTApi();
      }
      return;
    }
    if (this._musicAudio) {
      this._musicAudio.volume = this._musicVolume;
      this._musicAudio.play().catch(() => {});
    }
  }

  stopMusic() {
    if (this._musicAudio) {
      this._musicAudio.pause();
      this._musicAudio.currentTime = 0;
    }
    if (this._ytPlayer && this._ytReady) {
      try { this._ytPlayer.pauseVideo(); } catch (_) {}
    }
  }

  loadYouTube(urlOrId) {
    const id = this._parseYTId(urlOrId);
    if (!id) {
      this._ytVideoId = null;
      if (this._ytPlayer && this._ytReady) try { this._ytPlayer.stopVideo(); } catch (_) {}
      if (this._musicEnabled) this.startMusic();
      return;
    }
    this._ytVideoId = id;
    this._ytVolume = Math.round(this._musicVolume * 100);
    this.stopMusic();
    if (!this._musicEnabled) return;
    if (this._ytReady && this._ytPlayer) {
      this._ytPlayer.loadVideoById(id);
    } else {
      this._ytPendingPlay = true;
      this._loadYTApi();
    }
  }

  _loadYTApi() {
    if (this._ytApiLoaded) return;
    this._ytApiLoaded = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { if (prev) prev(); this._createYTPlayer(); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }

  _createYTPlayer() {
    let el = document.getElementById('_yt_player');
    if (!el) {
      el = document.createElement('div');
      el.id = '_yt_player';
      el.style.cssText = 'position:fixed;width:1px;height:1px;top:-2px;left:-2px;opacity:0;pointer-events:none;';
      document.body.appendChild(el);
    }
    this._ytPlayer = new window.YT.Player('_yt_player', {
      width: '1', height: '1',
      videoId: this._ytVideoId,
      playerVars: { autoplay: 1, loop: 1, playlist: this._ytVideoId, controls: 0, disablekb: 1, fs: 0, rel: 0 },
      events: {
        onReady: (e) => {
          this._ytReady = true;
          e.target.setVolume(this._ytVolume);
          if (this._musicEnabled && this._ytPendingPlay) {
            e.target.playVideo();
            this._ytPendingPlay = false;
          }
        },
        onError: () => {
          console.warn('YouTube player error — falling back to audio file');
          this._ytVideoId = null;
          if (this._musicEnabled) this.startMusic();
        },
      },
    });
  }

  _parseYTId(input) {
    if (!input?.trim()) return null;
    input = input.trim();
    if (/^[A-Za-z0-9_-]{11}$/.test(input)) return input;
    const s = input.match(/youtu\.be\/([A-Za-z0-9_-]{11})/);
    if (s) return s[1];
    const l = input.match(/[?&/](?:v=|embed\/)([A-Za-z0-9_-]{11})/);
    if (l) return l[1];
    return null;
  }

  setSfxEnabled(val) { this._sfxEnabled = val; }

  setMusicEnabled(val) {
    this._musicEnabled = val;
    if (!val) {
      this.stopMusic();
      if (this._ytPlayer && this._ytReady) try { this._ytPlayer.stopVideo(); } catch (_) {}
    } else {
      this.startMusic();
    }
  }

  setSfxVolume(v) {
    this._sfxVolume = v;
    if (this._sfxGain) this._sfxGain.gain.value = v;
  }

  setMusicVolume(v) {
    this._musicVolume = v;
    if (this._musicGain) this._musicGain.gain.value = v;
    if (this._musicAudio) this._musicAudio.volume = v;
    this._ytVolume = Math.round(v * 100);
    if (this._ytPlayer && this._ytReady) try { this._ytPlayer.setVolume(this._ytVolume); } catch (_) {}
  }

  getYTVideoId() { return this._ytVideoId; }
}
