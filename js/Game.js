import { CONFIG } from './config.js';
import { WordManager } from './WordManager.js';
import { ScoreManager } from './ScoreManager.js';
import { SoundManager } from './SoundManager.js';
import { UIManager } from './UIManager.js';
import { PowerUpManager } from './PowerUpManager.js';
import { ParticleSystem } from './Particle.js';
import { Background } from './Background.js';

const STATE = {
  MAIN_MENU: 'mainMenu',
  DIFFICULTY: 'difficultySelect',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'gameOver',
  HIGH_SCORES: 'highScores',
  SETTINGS: 'settings',
  HOW_TO_PLAY: 'howToPlay',
};

export class Game {
  constructor(canvas) {
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._state = STATE.MAIN_MENU;
    this._difficulty = null;
    this._difficultyId = 'medium';
    this._typedInput = '';
    this._lastTime = null;
    this._animFrame = null;
    this._matchedWord = null;

    this._wordManager = new WordManager(CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
    this._scoreManager = new ScoreManager();
    this._soundManager = new SoundManager();
    this._uiManager = new UIManager();
    this._powerupManager = new PowerUpManager();
    this._particleSystem = new ParticleSystem();
    this._background = new Background(CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

    this._settings = this._loadSettings();

    // FPS tracking
    this._fps = 0;
    this._fpsFrameCount = 0;
    this._fpsElapsed = 0;
    this._showFps = true;
  }

  init() {
    this._soundManager.init();
    this._uiManager.init();
    this._setupEventListeners();
    this._applySettings();
    this._uiManager.showScreen(STATE.MAIN_MENU);
    this._loop(performance.now());
  }

  _loop(timestamp) {
    const dt = this._lastTime ? Math.min(timestamp - this._lastTime, 100) : 16;
    this._lastTime = timestamp;

    // Rolling FPS average — update display every 500ms
    this._fpsFrameCount++;
    this._fpsElapsed += dt;
    if (this._fpsElapsed >= 500) {
      this._fps = Math.round(this._fpsFrameCount * 1000 / this._fpsElapsed);
      this._fpsFrameCount = 0;
      this._fpsElapsed = 0;
    }

    this._update(dt);
    this._draw();
    this._animFrame = requestAnimationFrame(t => this._loop(t));
  }

  _update(dt) {
    this._background.update(dt);
    this._particleSystem.update(dt);

    if (this._state !== STATE.PLAYING) return;

    this._wordManager.update(dt, false);
    this._powerupManager.update(dt);

    // Process missed words
    const missed = this._wordManager.getMissedWords();
    for (const word of missed) {
      this._wordManager.markMissedProcessed(word);
      this._scoreManager.onWordMissed();
      this._soundManager.play('missed');
      this._uiManager.showNotification(`"${word.text}" escaped! -1 life`, '#ff5252', 1500);

      if (this._scoreManager.isGameOver()) {
        this._endGame();
        return;
      }
    }

    this._wordManager.removeDeadWords();

    // Update HUD
    const stats = {
      ...this._scoreManager.getStats(),
      phase: this._wordManager.getPhase(),
    };
    this._uiManager.updateHUD(stats);
    this._uiManager.updatePowerups(this._powerupManager.getActive());

    // Update matched word for input display
    this._matchedWord = this._wordManager.updateTypingHighlight(this._typedInput);
    this._uiManager.updateInputDisplay(this._typedInput, this._matchedWord);
  }

  _draw() {
    const ctx = this._ctx;
    ctx.clearRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);

    this._background.draw(ctx);

    if (this._state === STATE.PLAYING || this._state === STATE.PAUSED) {
      this._wordManager.draw(ctx);
      this._particleSystem.draw(ctx);

      const stats = {
        ...this._scoreManager.getStats(),
        phase: this._wordManager.getPhase(),
      };
      this._uiManager.drawHUDCanvas(ctx, stats, CONFIG.CANVAS.WIDTH);
    }

    this._drawFPS(ctx);
  }

  _drawFPS(ctx) {
    if (!this._showFps || this._fps === 0) return;
    const color = this._fps >= 50 ? 'rgba(100,220,100,0.75)'
                : this._fps >= 30 ? 'rgba(255,210,50,0.75)'
                :                   'rgba(255,80,80,0.85)';
    ctx.save();
    ctx.font = '500 12px "Fredoka", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(`${this._fps} FPS`, 10, 10);
    ctx.restore();
  }

  _setupEventListeners() {
    document.addEventListener('keydown', e => this._onKeyDown(e));

    //main menu
    this._on('btn-play', 'click', () => this._showDifficulty());
    this._on('btn-howtoplay', 'click', () => this._uiManager.showScreen(STATE.HOW_TO_PLAY));
    this._on('btn-highscores-menu', 'click', () => this._showHighScores());
    this._on('btn-settings-menu', 'click', () => this._showSettings());

    document.querySelectorAll('.diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._difficultyId = btn.dataset.difficulty;
        this._startGame();
      });
    });
    this._on('btn-back-diff', 'click', () => this._uiManager.showScreen(STATE.MAIN_MENU));

    this._on('btn-pause', 'click', () => this._pause());

    this._on('btn-resume', 'click', () => this._resume());
    this._on('btn-restart-pause', 'click', () => { this._resume(); this._startGame(); });
    this._on('btn-menu-pause', 'click', () => { this._resume(); this._uiManager.showScreen(STATE.MAIN_MENU); });

    this._on('btn-restart', 'click', () => this._startGame());
    this._on('btn-menu-go', 'click', () => this._uiManager.showScreen(STATE.MAIN_MENU));
    this._on('btn-hs-go', 'click', () => this._showHighScores());

    this._on('btn-back-hs', 'click', () => this._uiManager.showScreen(STATE.MAIN_MENU));

    document.querySelectorAll('.hs-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.hs-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        document.querySelectorAll('.hs-panel').forEach(p => p.classList.add('hidden'));
        const panel = document.getElementById(`hs-panel-${tab.dataset.diff}`);
        if (panel) panel.classList.remove('hidden');
      });
    });

    this._on('btn-back-settings', 'click', () => this._saveSettings());

    const sfxToggle = document.getElementById('toggle-sfx');
    if (sfxToggle) sfxToggle.addEventListener('change', e => {
      this._settings.sfxEnabled = e.target.checked;
      this._soundManager.setSfxEnabled(e.target.checked);
    });

    const musicToggle = document.getElementById('toggle-music');
    if (musicToggle) musicToggle.addEventListener('change', e => {
      this._settings.musicEnabled = e.target.checked;
      this._soundManager.setMusicEnabled(e.target.checked);
    });

    const sfxVol = document.getElementById('sfx-volume');
    if (sfxVol) sfxVol.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      this._settings.sfxVolume = v;
      this._soundManager.setSfxVolume(v);
    });

    const musicVol = document.getElementById('music-volume');
    if (musicVol) musicVol.addEventListener('input', e => {
      const v = parseFloat(e.target.value);
      this._settings.musicVolume = v;
      this._soundManager.setMusicVolume(v);
    });

    this._on('btn-back-howto', 'click', () => this._uiManager.showScreen(STATE.MAIN_MENU));
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      if (this._state === STATE.PLAYING) { this._pause(); return; }
      if (this._state === STATE.PAUSED) { this._resume(); return; }
    }

    if (this._state !== STATE.PLAYING) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      this._submitWord();
      return;
    }

    if (e.key === 'Backspace') {
      e.preventDefault();
      if (this._typedInput.length > 0) {
        this._typedInput = this._typedInput.slice(0, -1);
        this._soundManager.play('type');
      }
      return;
    }

    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      this._typedInput += e.key;
      this._soundManager.play('type');
    }
  }

  _submitWord() {
    if (!this._typedInput.trim()) return;

    const word = this._wordManager.trySubmit(this._typedInput);
    if (word) {
      this._onWordDestroyed(word);
    } else {
      this._soundManager.play('incorrect');
      this._uiManager.flashIncorrect();
      this._scoreManager.onIncorrectChar();
    }
    this._typedInput = '';
    this._matchedWord = null;
  }

  _onWordDestroyed(word) {
    const diffConfig = this._difficulty;
    const result = this._scoreManager.onWordTyped(word, diffConfig.scoreMultiplier);
    const colors = CONFIG.CATEGORY_COLORS[word.category] || CONFIG.CATEGORY_COLORS.common;

    this._particleSystem.explode(word.getCenterX(), word.getCenterY(), colors.base);

    const multStr = result.multiplier > 1 ? ` x${result.multiplier.toFixed(1)}` : '';
    this._particleSystem.addFloatingText(
      word.getCenterX(),
      word.getCenterY() - 20,
      `+${result.earned}${multStr}`,
      colors.base
    );

    this._soundManager.play('correct');
    if (result.comboLevel > 0) {
      this._soundManager.play('combo', result.comboLevel);
    }

    if (word.category === CONFIG.CATEGORIES.POWERUP) {
      this._activatePowerup(word.text.toLowerCase());
    }

    if (word.category === CONFIG.CATEGORIES.BONUS) {
      this._uiManager.showNotification(`BONUS WORD! +${result.earned}`, CONFIG.CATEGORY_COLORS.bonus.base);
    }
  }

  _activatePowerup(pwId) {
    const pwType = this._powerupManager.activate(pwId, this._wordManager, this._scoreManager, {
      onClearAll: (cleared) => {
        cleared.forEach(w => {
          const colors = CONFIG.CATEGORY_COLORS[w.category] || CONFIG.CATEGORY_COLORS.common;
          this._particleSystem.explode(w.getCenterX(), w.getCenterY(), colors.base, 10);
        });
        this._uiManager.showNotification('CLEAR ALL!', CONFIG.POWERUP_TYPES.CLEAR_ALL.color);
      },
      onExtraLife: () => {
        this._uiManager.showNotification('EXTRA LIFE!', CONFIG.POWERUP_TYPES.EXTRA_LIFE.color);
      },
    });

    if (pwType) {
      this._soundManager.play('powerup');
      if (pwType.id !== 'clearall' && pwType.id !== 'extralife') {
        this._uiManager.showNotification(`${pwType.name} ACTIVATED!`, pwType.color);
      }
    }
  }

  _showDifficulty() {
    this._uiManager.showScreen(STATE.DIFFICULTY);
  }

  _startGame() {
    const diffMap = {
      easy: CONFIG.DIFFICULTY.EASY,
      medium: CONFIG.DIFFICULTY.MEDIUM,
      hard: CONFIG.DIFFICULTY.HARD,
    };
    this._difficulty = diffMap[this._difficultyId] || CONFIG.DIFFICULTY.MEDIUM;

    this._particleSystem.clear();
    this._powerupManager.clear();
    this._wordManager.init(this._difficulty);
    this._scoreManager.startGame(this._difficulty.lives);
    this._typedInput = '';
    this._matchedWord = null;
    this._state = STATE.PLAYING;

    this._uiManager.showScreen('gameplay');
    if (this._settings.musicEnabled) this._soundManager.startMusic();
  }

  _pause() {
    if (this._state !== STATE.PLAYING) return;
    this._state = STATE.PAUSED;
    this._uiManager.showPauseMenu(true);
    this._soundManager.stopMusic();
  }

  _resume() {
    if (this._state !== STATE.PAUSED) return;
    this._state = STATE.PLAYING;
    this._uiManager.showPauseMenu(false);
    if (this._settings.musicEnabled) this._soundManager.startMusic();
  }

  _endGame() {
    this._state = STATE.GAME_OVER;
    this._soundManager.stopMusic();
    this._soundManager.play('gameOver');

    const stats = this._scoreManager.getStats();
    const isNewHS = this._scoreManager.isNewHighScore(this._difficultyId);
    this._scoreManager.saveHighScore(this._difficultyId, 'Player');

    this._uiManager.populateGameOver(stats, isNewHS);
    this._uiManager.showScreen('gameOver');
  }

  _showHighScores() {
    const all = {
      easy: this._scoreManager.getHighScores('easy'),
      medium: this._scoreManager.getHighScores('medium'),
      hard: this._scoreManager.getHighScores('hard'),
    };
    this._uiManager.populateHighScores(all);
    this._uiManager.showScreen(STATE.HIGH_SCORES);

    document.querySelectorAll('.hs-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.hs-panel').forEach(p => p.classList.add('hidden'));
    const firstTab = document.querySelector('.hs-tab');
    if (firstTab) {
      firstTab.classList.add('active');
      const panel = document.getElementById(`hs-panel-${firstTab.dataset.diff}`);
      if (panel) panel.classList.remove('hidden');
    }
  }

  _showSettings() {
    const sfxToggle = document.getElementById('toggle-sfx');
    const musicToggle = document.getElementById('toggle-music');
    const sfxVol = document.getElementById('sfx-volume');
    const musicVol = document.getElementById('music-volume');
    if (sfxToggle)   sfxToggle.checked   = this._settings.sfxEnabled;
    if (musicToggle) musicToggle.checked = this._settings.musicEnabled;
    if (sfxVol)      sfxVol.value        = this._settings.sfxVolume;
    if (musicVol)    musicVol.value      = this._settings.musicVolume;
    this._uiManager.showScreen(STATE.SETTINGS);
  }

  _applySettings() {
    this._soundManager.setSfxEnabled(this._settings.sfxEnabled);
    this._soundManager.setMusicEnabled(this._settings.musicEnabled);
    this._soundManager.setSfxVolume(this._settings.sfxVolume);
    this._soundManager.setMusicVolume(this._settings.musicVolume);
  }

  _saveSettings() {
    try {
      localStorage.setItem('typingRacer_settings', JSON.stringify(this._settings));
    } catch (_) {}
    this._uiManager.showScreen(STATE.MAIN_MENU);
  }

  _loadSettings() {
    try {
      const raw = localStorage.getItem('typingRacer_settings');
      if (raw) return { ...this._defaultSettings(), ...JSON.parse(raw) };
    } catch (_) {}
    return this._defaultSettings();
  }

  _defaultSettings() {
    return {
      sfxEnabled: true,
      musicEnabled: true,
      sfxVolume: 0.5,
      musicVolume: 0.25,
    };
  }

  _on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }
}
