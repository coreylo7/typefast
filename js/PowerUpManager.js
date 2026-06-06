import { CONFIG } from './config.js';

export class PowerUpManager {
  constructor() {
    this._active = [];
    this._display = [];
  }

  activate(powerupId, wordManager, scoreManager, gameCallbacks) {
    const pwType = Object.values(CONFIG.POWERUP_TYPES).find(p => p.id === powerupId.toLowerCase());
    if (!pwType) return null;

    switch (pwType.id) {
      case 'slowmo':
        wordManager.slowDown(0.3, pwType.duration);
        this._addActive(pwType);
        break;

      case 'clearall': {
        const cleared = wordManager.clearAll();
        cleared.forEach(w => {
          scoreManager.score += w.points;
        });
        if (gameCallbacks.onClearAll) gameCallbacks.onClearAll(cleared);
        break;
      }

      case 'extralife':
        if (scoreManager.lives < CONFIG.MAX_LIVES) {
          scoreManager.lives++;
        }
        if (gameCallbacks.onExtraLife) gameCallbacks.onExtraLife();
        break;

      case 'scoremult':
        scoreManager.activateScoreMultiplier(2, pwType.duration);
        this._addActive(pwType);
        break;
    }

    return pwType;
  }

  _addActive(pwType) {
    const entry = {
      id: pwType.id,
      name: pwType.name,
      color: pwType.color,
      icon: pwType.icon,
      duration: pwType.duration,
      elapsed: 0,
    };
    this._active.push(entry);
  }

  update(dt) {
    for (let i = this._active.length - 1; i >= 0; i--) {
      this._active[i].elapsed += dt;
      if (this._active[i].elapsed >= this._active[i].duration) {
        this._active.splice(i, 1);
      }
    }
  }

  getActive() {
    return this._active.map(a => ({
      ...a,
      progress: 1 - a.elapsed / a.duration,
    }));
  }

  clear() {
    this._active = [];
  }
}
