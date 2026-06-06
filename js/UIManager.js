import { CONFIG } from './config.js';

export class UIManager {
  constructor() {
    this._screens = {};
    this._currentScreen = null;
    this._hud = null;
    this._overlay = null;
    this._inputEl = null;
    this._pauseMenu = null;
    this._powerupDisplay = null;
    this._notification = null;
    this._notifTimer = null;

    //cached HUD values
    this._prevHUD = {};
    this._prevPowerupKey = '';
    this._prevInputText = null;
    this._prevMatchId = null;
  }

  init() {
    this._screens = {
      mainMenu: document.getElementById('screen-main'),
      difficultySelect: document.getElementById('screen-difficultySelect'),
      gameOver: document.getElementById('screen-gameOver'),
      highScores: document.getElementById('screen-highScores'),
      settings: document.getElementById('screen-settings'),
      howToPlay: document.getElementById('screen-howToPlay'),
    };
    this._hud = document.getElementById('hud');
    this._overlay = document.getElementById('overlay');
    this._inputEl = document.getElementById('type-input');
    this._pauseMenu = document.getElementById('pause-menu');
    this._powerupDisplay = document.getElementById('powerup-display');
    this._notification = document.getElementById('notification');
    this._pauseBtn = document.getElementById('btn-pause');
    this._inputInstructions = document.getElementById('input-instructions');

    //cache references to individual HUD elements
    this._hudScore    = document.getElementById('hud-score');
    this._hudLives    = document.getElementById('hud-lives');
    this._hudWpm      = document.getElementById('hud-wpm');
    this._hudAccuracy = document.getElementById('hud-accuracy');
    this._hudStreak   = document.getElementById('hud-streak');
    this._hudCombo    = document.getElementById('hud-combo');
    this._inputText   = this._inputEl?.querySelector('.input-text');
    this._inputHint   = this._inputEl?.querySelector('.input-hint');

    Object.values(this._screens).forEach(s => { if (s) s.classList.add('hidden'); });
  }

  showScreen(name) {
    Object.values(this._screens).forEach(s => { if (s) s.classList.add('hidden'); });
    if (this._screens[name]) {
      this._screens[name].classList.remove('hidden');
      this._screens[name].classList.add('fade-in');
    }
    this._currentScreen = name;

    const isGameplay = name === 'gameplay';
    if (this._hud)              this._hud.classList.toggle('hidden', !isGameplay);
    if (this._overlay)          this._overlay.classList.toggle('active', !isGameplay);
    if (this._inputEl)          this._inputEl.classList.toggle('hidden', !isGameplay);
    if (this._pauseBtn)         this._pauseBtn.classList.toggle('hidden', !isGameplay);
    if (this._inputInstructions) this._inputInstructions.classList.toggle('hidden', !isGameplay);

    if (isGameplay) this._prevHUD = {};
  }

  updateHUD(stats) {
    const p = this._prevHUD;

    if (stats.score !== p.score) {
      if (this._hudScore) this._hudScore.textContent = this._formatScore(stats.score);
      p.score = stats.score;
    }
    if (stats.lives !== p.lives) {
      if (this._hudLives) this._hudLives.innerHTML = this._renderHearts(stats.lives);
      p.lives = stats.lives;
    }
    if (stats.wpm !== p.wpm) {
      if (this._hudWpm) this._hudWpm.textContent = `${stats.wpm} WPM`;
      p.wpm = stats.wpm;
    }
    if (stats.accuracy !== p.accuracy) {
      if (this._hudAccuracy) this._hudAccuracy.textContent = `${stats.accuracy}%`;
      p.accuracy = stats.accuracy;
    }
    if (stats.comboStreak !== p.comboStreak) {
      if (this._hudStreak) this._hudStreak.textContent = stats.comboStreak;
      p.comboStreak = stats.comboStreak;
    }
    if (stats.comboLevel !== p.comboLevel) {
      const el = this._hudCombo;
      if (el) {
        const level = stats.comboLevel;
        el.textContent = level >= 1 ? `${(1 + level * 0.5).toFixed(1)}x` : '';
        el.className = `combo-badge level-${Math.min(level, 5)}`;
        el.style.display = level >= 1 ? 'inline-block' : 'none';
      }
      p.comboLevel = stats.comboLevel;
    }
  }

  updatePowerups(active) {
    if (!this._powerupDisplay) return;

    const key = active.length === 0
      ? ''
      : active.map(p => `${p.id}:${Math.round(p.progress * 20)}`).join(',');

    if (key === this._prevPowerupKey) return;
    this._prevPowerupKey = key;

    if (active.length === 0) {
      this._powerupDisplay.innerHTML = '';
      return;
    }
    this._powerupDisplay.innerHTML = active.map(p => `
      <div class="powerup-badge" style="--pw-color:${p.color}">
        <span class="pw-icon">${p.icon}</span>
        <span class="pw-name">${p.name}</span>
        <div class="pw-bar"><div class="pw-bar-fill" style="width:${p.progress * 100}%"></div></div>
      </div>
    `).join('');
  }

  updateInputDisplay(inputText, matchedWord) {
    if (!this._inputEl) return;

    const matchId = matchedWord ? matchedWord.id : null;
    if (inputText === this._prevInputText && matchId === this._prevMatchId) return;
    this._prevInputText = inputText;
    this._prevMatchId = matchId;

    if (this._inputText) this._inputText.textContent = inputText || '';

    if (this._inputHint) {
      if (matchedWord && inputText) {
        this._inputHint.textContent = matchedWord.text;
        this._inputHint.style.opacity = '0.4';
      } else {
        this._inputHint.textContent = '';
      }
    }

    this._inputEl.classList.toggle('match', !!matchedWord && !!inputText);
  }

  flashIncorrect() {
    if (!this._inputEl) return;
    this._inputEl.classList.add('incorrect');
    setTimeout(() => this._inputEl.classList.remove('incorrect'), 200);
  }

  showPauseMenu(show) {
    if (this._pauseMenu) this._pauseMenu.classList.toggle('hidden', !show);
  }

  populateGameOver(stats, isNewHighScore) {
    this._set('go-score', this._formatScore(stats.score));
    this._set('go-words', stats.wordsTyped);
    this._set('go-wpm', `${stats.wpm} WPM`);
    this._set('go-accuracy', `${stats.accuracy}%`);
    this._set('go-streak', stats.longestStreak);
    this._set('go-time', this._formatTime(stats.elapsed));

    const badge = document.getElementById('go-highscore-badge');
    if (badge) badge.classList.toggle('hidden', !isNewHighScore);
  }

  populateHighScores(scoresByDifficulty) {
    ['easy', 'medium', 'hard'].forEach(diff => {
      const container = document.getElementById(`hs-list-${diff}`);
      if (!container) return;
      const scores = scoresByDifficulty[diff] || [];
      if (scores.length === 0) {
        container.innerHTML = '<div class="hs-empty">No scores yet</div>';
        return;
      }
      container.innerHTML = scores.map((s, i) => `
        <div class="hs-row ${i === 0 ? 'hs-first' : ''}">
          <span class="hs-rank">#${i + 1}</span>
          <span class="hs-name">${this._esc(s.playerName)}</span>
          <span class="hs-score">${this._formatScore(s.score)}</span>
          <span class="hs-wpm">${s.wpm} WPM</span>
          <span class="hs-acc">${s.accuracy}%</span>
          <span class="hs-date">${s.date}</span>
        </div>
      `).join('');
    });
  }

  showNotification(text, color = '#64b5f6', duration = 2000) {
    if (!this._notification) return;
    clearTimeout(this._notifTimer);
    this._notification.textContent = text;
    this._notification.style.color = color;
    this._notification.style.borderColor = color;
    this._notification.classList.remove('hidden');
    this._notification.classList.add('notif-show');
    this._notifTimer = setTimeout(() => {
      this._notification.classList.remove('notif-show');
      this._notification.classList.add('hidden');
    }, duration);
  }

  drawHUDCanvas(ctx, stats, canvasWidth) {
    ctx.save();
    ctx.font = '600 14px "Fredoka", sans-serif';
    ctx.fillStyle = 'rgba(137,180,250,0.5)';
    ctx.textAlign = 'right';
    ctx.fillText(`PHASE ${stats.phase}`, canvasWidth - 16, 22);
    ctx.restore();
  }

  _renderHearts(lives) {
    let html = '';
    for (let i = 0; i < CONFIG.MAX_LIVES; i++) {
      if (i < lives)   html += '<span class="heart active">♥</span>';
      else if (i < 5)  html += '<span class="heart empty">♡</span>';
    }
    return html;
  }

  _formatScore(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  _formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  _set(id, content) {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof content === 'string' && content.includes('<')) el.innerHTML = content;
    else el.textContent = content;
  }

  _esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
