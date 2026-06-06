import { CONFIG } from './config.js';
import { Word } from './Word.js';
import { WORD_LISTS, getRandomWordByCategory, getWeightedCategory } from './wordlists.js';

export class WordManager {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.words = [];
    this._spawnTimer = 0;
    this._nextSpawnIn = 2000;
    this._difficultyConfig = null;
    this._elapsedSeconds = 0;
    this._speedMultiplier = 1;
    this._slowMultiplier = 1;
    this._spawnRateMultiplier = 1;
    this._paused = false;
    this._usedYSlots = new Set();
    this._recentWords = [];
  }

  init(difficultyConfig) {
    this._difficultyConfig = difficultyConfig;
    this.words = [];
    this._spawnTimer = 0;
    this._nextSpawnIn = difficultyConfig.spawnInterval.max;
    this._elapsedSeconds = 0;
    this._speedMultiplier = 1;
    this._slowMultiplier = 1;
    this._spawnRateMultiplier = 1;
    this._recentWords = [];
  }

  update(dt, paused = false) {
    if (paused) return;

    this._elapsedSeconds += dt / 1000;
    this._updateProgression();
    this._spawnTimer += dt;

    if (this._spawnTimer >= this._nextSpawnIn && this.words.length < this._difficultyConfig.maxWords) {
      this._spawnWord();
      this._spawnTimer = 0;
      const cfg = this._difficultyConfig;
      const minInterval = Math.max(
        CONFIG.PROGRESSION.minSpawnIntervalMs,
        cfg.spawnInterval.min / this._spawnRateMultiplier
      );
      const maxInterval = Math.max(
        minInterval + 200,
        cfg.spawnInterval.max / this._spawnRateMultiplier
      );
      this._nextSpawnIn = minInterval + Math.random() * (maxInterval - minInterval);
    }

    for (const word of this.words) {
      word.update(dt, this._speedMultiplier * this._slowMultiplier);
    }
  }

  _updateProgression() {
    const phase = Math.floor(this._elapsedSeconds / CONFIG.PROGRESSION.phaseIntervalSeconds);
    this._speedMultiplier = Math.min(
      CONFIG.PROGRESSION.maxSpeedMultiplier,
      1 + phase * CONFIG.PROGRESSION.speedIncreasePerSecond * CONFIG.PROGRESSION.phaseIntervalSeconds
    );
    this._spawnRateMultiplier = 1 + phase * CONFIG.PROGRESSION.spawnRateIncreasePerSecond * CONFIG.PROGRESSION.phaseIntervalSeconds;
  }

  _spawnWord() {
    const cfg = this._difficultyConfig;
    const lenRange = cfg.wordLengthRange;

    // Decide category
    let category;
    const roll = Math.random();
    if (roll < CONFIG.POWERUP_WORD_CHANCE) {
      category = CONFIG.CATEGORIES.POWERUP;
    } else if (roll < CONFIG.POWERUP_WORD_CHANCE + CONFIG.BONUS_WORD_CHANCE) {
      category = CONFIG.CATEGORIES.BONUS;
    } else {
      category = getWeightedCategory(CONFIG.CATEGORY_WEIGHTS);
    }

    let text;
    if (category === CONFIG.CATEGORIES.POWERUP) {
      const pwTypes = Object.values(CONFIG.POWERUP_TYPES);
      const pw = pwTypes[Math.floor(Math.random() * pwTypes.length)];
      text = pw.id.toUpperCase();
      category = CONFIG.CATEGORIES.POWERUP;
    } else {
      text = this._pickWord(category, lenRange);
    }

    const speed = cfg.wordSpeed.min + Math.random() * (cfg.wordSpeed.max - cfg.wordSpeed.min);

    // Pick a Y position that doesn't collide with existing words
    const y = this._pickYPosition();

    const word = new Word({
      text,
      x: CONFIG.SPAWN_MARGIN_LEFT + 10,
      y,
      speed: speed * this._speedMultiplier,
      category,
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
    });

    this.words.push(word);
    this._recentWords.push(text);
    if (this._recentWords.length > 20) this._recentWords.shift();
  }

  _pickWord(category, lenRange) {
    let attempts = 0;
    let word;
    do {
      word = getRandomWordByCategory(category, lenRange);
      attempts++;
    } while (this._recentWords.includes(word) && attempts < 10);
    return word;
  }

  _pickYPosition() {
    const margin = CONFIG.WORD_MARGIN_Y;
    const usable = this.canvasHeight - margin * 2;
    const slots = Math.floor(usable / (CONFIG.WORD_HEIGHT + 12));
    const occupied = new Set(this.words.map(w => Math.round(w.y / (CONFIG.WORD_HEIGHT + 12))));

    // Try to find an unoccupied slot
    for (let tries = 0; tries < 20; tries++) {
      const slot = Math.floor(Math.random() * slots);
      if (!occupied.has(slot)) {
        return margin + slot * (CONFIG.WORD_HEIGHT + 12) + CONFIG.WORD_HEIGHT / 2;
      }
    }

    // Fallback: random position
    return margin + Math.random() * usable;
  }

  // Returns word that best matches the current input
  findMatch(input) {
    if (!input) return null;
    const lower = input.toLowerCase();
    let best = null;
    let bestScore = -1;

    for (const word of this.words) {
      if (word.isDestroyed || word.isMissed) continue;
      if (word.text.toLowerCase().startsWith(lower)) {
        // Prefer longer match, then leftmost word
        const score = lower.length * 1000 - word.x;
        if (score > bestScore) {
          bestScore = score;
          best = word;
        }
      }
    }
    return best;
  }

  // Update all words' typed highlighting
  updateTypingHighlight(input) {
    const match = this.findMatch(input);
    for (const word of this.words) {
      if (word.isDestroyed || word.isMissed) continue;
      if (word === match) {
        word.setTypedLength(input.length);
      } else {
        word.setTypedLength(0);
      }
    }
    return match;
  }

  trySubmit(input) {
    const lower = input.toLowerCase();
    for (const word of this.words) {
      if (word.isDestroyed || word.isMissed) continue;
      if (word.text.toLowerCase() === lower) {
        word.setTypedLength(word.text.length);
        word.destroy();
        return word;
      }
    }
    return null;
  }

  getMissedWords() {
    return this.words.filter(w => w.isMissed && !w._missedProcessed);
  }

  markMissedProcessed(word) {
    word._missedProcessed = true;
  }

  removeDeadWords() {
    this.words = this.words.filter(w => !w.isDestroyed && !(w.isMissed && w._missedProcessed));
  }

  clearAll() {
    const cleared = this.words.filter(w => !w.isDestroyed && !w.isMissed);
    this.words.forEach(w => { w.isDestroyed = true; });
    return cleared;
  }

  slowDown(factor, duration) {
    this._slowMultiplier = factor;
    setTimeout(() => {
      this._slowMultiplier = 1;
    }, duration);
  }

  getSpeedMultiplier() { return this._speedMultiplier; }
  getPhase() {
    return Math.floor(this._elapsedSeconds / CONFIG.PROGRESSION.phaseIntervalSeconds) + 1;
  }

  draw(ctx) {
    for (const word of this.words) {
      if (!word.isDestroyed) {
        word.draw(ctx);
      }
    }
  }
}
