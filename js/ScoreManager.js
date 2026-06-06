import { CONFIG } from './config.js';

export class ScoreManager {
  constructor() {
    this.reset();
    this._data = this._load();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.wordsTyped = 0;
    this.wordsMissed = 0;
    this.totalCharsTyped = 0;
    this.correctCharsTyped = 0;
    this.comboStreak = 0;
    this.longestStreak = 0;
    this.comboMultiplier = 1;
    this.comboLevel = 0;
    this.startTime = null;
    this.lastWordTime = null;
    this.wpm = 0;
    this.accuracy = 100;
    this._scoreMultiplierActive = false;
    this._scoreMultiplierValue = 1;
    this._pendingScoreMultiplier = 1;
  }

  startGame(lives) {
    this.reset();
    this.lives = lives;
    this.startTime = Date.now();
    this.lastWordTime = Date.now();
  }

  onWordTyped(word, difficultyMultiplier = 1) {
    const now = Date.now();
    this.wordsTyped++;
    this.comboStreak++;
    if (this.comboStreak > this.longestStreak) {
      this.longestStreak = this.comboStreak;
    }

    //update combo level
    this.comboLevel = Math.min(
      CONFIG.COMBO.maxMultiplier - 1,
      Math.floor(this.comboStreak / CONFIG.COMBO.streakPerLevel)
    );
    this.comboMultiplier = 1 + this.comboLevel * 0.5;

    //calculate points
    const base = word.points;
    const totalMult = this.comboMultiplier * difficultyMultiplier * this._pendingScoreMultiplier;
    const earned = Math.round(base * totalMult);
    this.score += earned;

    //update chars
    this.correctCharsTyped += word.text.length;
    this.totalCharsTyped += word.text.length;

    //accuracy
    this._updateAccuracy();

    this.lastWordTime = now;
    return { earned, multiplier: totalMult, comboLevel: this.comboLevel };
  }

  onWordMissed() {
    this.wordsMissed++;
    this.lives--;
    if (CONFIG.COMBO.decayOnMiss) {
      this.comboStreak = 0;
      this.comboLevel = 0;
      this.comboMultiplier = 1;
    }
  }

  onIncorrectChar() {
    this.totalCharsTyped++;
    this._updateAccuracy();
  }

  _updateAccuracy() {
    if (this.totalCharsTyped === 0) {
      this.accuracy = 100;
    } else {
      this.accuracy = Math.round((this.correctCharsTyped / this.totalCharsTyped) * 100);
    }
  }

  activateScoreMultiplier(value, duration) {
    this._pendingScoreMultiplier = value;
    this._scoreMultiplierActive = true;
    clearTimeout(this._multTimer);
    this._multTimer = setTimeout(() => {
      this._pendingScoreMultiplier = 1;
      this._scoreMultiplierActive = false;
    }, duration);
  }

  isGameOver() {
    return this.lives <= 0;
  }

  getElapsedSeconds() {
    if (!this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  getStats() {
    const elapsedMinutes = this.startTime ? (Date.now() - this.startTime) / 60000 : 0;
    const wpm = (elapsedMinutes > 0.05 && this.correctCharsTyped > 0)
      ? Math.round((this.correctCharsTyped / 5) / elapsedMinutes)
      : 0;

    return {
      score: this.score,
      lives: this.lives,
      wordsTyped: this.wordsTyped,
      wordsMissed: this.wordsMissed,
      accuracy: this.accuracy,
      wpm,
      comboStreak: this.comboStreak,
      longestStreak: this.longestStreak,
      comboMultiplier: this.comboMultiplier,
      comboLevel: this.comboLevel,
      elapsed: this.getElapsedSeconds(),
    };
  }

  saveHighScore(difficulty, playerName) {
    const stats = this.getStats();
    const entry = {
      score: stats.score,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      longestStreak: stats.longestStreak,
      wordsTyped: stats.wordsTyped,
      difficulty,
      playerName: playerName || 'Anonymous',
      date: new Date().toLocaleDateString(),
      timestamp: Date.now(),
    };

    if (!this._data.highScores[difficulty]) {
      this._data.highScores[difficulty] = [];
    }
    this._data.highScores[difficulty].push(entry);
    this._data.highScores[difficulty].sort((a, b) => b.score - a.score);
    this._data.highScores[difficulty] = this._data.highScores[difficulty].slice(0, 10);

    this._data.allTime.totalGames++;
    this._data.allTime.totalWordsTyped += stats.wordsTyped;
    this._data.allTime.bestScore = Math.max(this._data.allTime.bestScore, stats.score);
    this._data.allTime.bestWpm = Math.max(this._data.allTime.bestWpm, stats.wpm);
    this._data.allTime.bestStreak = Math.max(this._data.allTime.bestStreak, stats.longestStreak);

    this._save();
    return entry;
  }

  getHighScores(difficulty) {
    return (this._data.highScores[difficulty] || []).slice(0, 10);
  }

  getAllTimeStats() {
    return this._data.allTime;
  }

  isNewHighScore(difficulty) {
    const scores = this._data.highScores[difficulty] || [];
    if (scores.length < 10) return true;
    return this.score > scores[scores.length - 1].score;
  }

  _load() {
    try {
      const raw = localStorage.getItem(CONFIG.LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return this._defaultData();
  }

  _save() {
    try {
      localStorage.setItem(CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(this._data));
    } catch (_) {}
  }

  _defaultData() {
    return {
      highScores: { easy: [], medium: [], hard: [] },
      allTime: {
        totalGames: 0,
        totalWordsTyped: 0,
        bestScore: 0,
        bestWpm: 0,
        bestStreak: 0,
      },
    };
  }
}
