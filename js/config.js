export const CONFIG = {
  CANVAS: {
    WIDTH: 1200,
    HEIGHT: 650,
  },

  DIFFICULTY: {
    EASY: {
      id: 'easy',
      name: 'Easy',
      description: 'Perfect for beginners',
      wordSpeed: { min: 35, max: 55 },
      spawnInterval: { min: 3000, max: 5000 },
      maxWords: 5,
      wordLengthRange: { min: 3, max: 6 },
      lives: 5,
      scoreMultiplier: 1,
    },
    MEDIUM: {
      id: 'medium',
      name: 'Medium',
      description: 'A solid challenge',
      wordSpeed: { min: 60, max: 95 },
      spawnInterval: { min: 1800, max: 2800 },
      maxWords: 8,
      wordLengthRange: { min: 4, max: 9 },
      lives: 3,
      scoreMultiplier: 1.5,
    },
    HARD: {
      id: 'hard',
      name: 'Hard',
      description: 'For speed typists only',
      wordSpeed: { min: 100, max: 155 },
      spawnInterval: { min: 900, max: 1600 },
      maxWords: 12,
      wordLengthRange: { min: 5, max: 14 },
      lives: 2,
      scoreMultiplier: 2,
    },
  },

  PROGRESSION: {
    speedIncreasePerSecond: 0.015,
    spawnRateIncreasePerSecond: 0.003,
    phaseIntervalSeconds: 30,
    maxSpeedMultiplier: 3.0,
    minSpawnIntervalMs: 600,
  },

  CATEGORIES: {
    COMMON: 'common',
    PROGRAMMING: 'programming',
    CS: 'cs',
    RANDOM: 'random',
    BONUS: 'bonus',
    POWERUP: 'powerup',
  },

  CATEGORY_COLORS: {
    common:      { base: '#89b4fa', typed: '#ffffff', glow: 'rgba(137,180,250,0.4)' },
    programming: { base: '#a6e3a1', typed: '#ffffff', glow: 'rgba(166,227,161,0.4)' },
    cs:          { base: '#fab387', typed: '#ffffff', glow: 'rgba(250,179,135,0.4)' },
    random:      { base: '#cba6f7', typed: '#ffffff', glow: 'rgba(203,166,247,0.4)' },
    bonus:       { base: '#f9e2af', typed: '#ffffff', glow: 'rgba(249,226,175,0.4)' },
    powerup:     { base: '#74c7ec', typed: '#ffffff', glow: 'rgba(116,199,236,0.4)' },
  },

  CATEGORY_WEIGHTS: {
    common: 0.45,
    programming: 0.25,
    cs: 0.20,
    random: 0.10,
  },

  BONUS_WORD_CHANCE: 0.08,
  POWERUP_WORD_CHANCE: 0.05,

  POINTS: {
    basePerChar: 8,
    lengthBonus: 3,
    speedBonus: 0.5,
    bonusMultiplier: 3,
    powerupBonus: 50,
  },

  COMBO: {
    maxMultiplier: 6,
    streakPerLevel: 4,
    decayOnMiss: true,
  },

  POWERUP_TYPES: {
    SLOW_MO: {
      id: 'slowmo',
      name: 'SLOW-MO',
      icon: '⏱',
      color: '#00e5ff',
      duration: 5000,
      description: 'Slows all words for 5s',
    },
    CLEAR_ALL: {
      id: 'clearall',
      name: 'CLEAR ALL',
      icon: '💥',
      color: '#ff5722',
      duration: 0,
      description: 'Destroys all words on screen',
    },
    EXTRA_LIFE: {
      id: 'extralife',
      name: 'EXTRA LIFE',
      icon: '❤',
      color: '#e91e63',
      duration: 0,
      description: 'Grants an extra life',
    },
    SCORE_MULT: {
      id: 'scoremult',
      name: '2X SCORE',
      icon: '⭐',
      color: '#ffd700',
      duration: 8000,
      description: 'Doubles score for 8s',
    },
  },

  WORD_FONT_SIZE: 22,
  WORD_PADDING: 12,
  WORD_HEIGHT: 38,
  WORD_MARGIN_Y: 50,

  PARTICLE_COUNT: 20,
  PARTICLE_LIFETIME: 800,

  FLOATING_TEXT_DURATION: 1200,
  FLOATING_TEXT_RISE: 60,

  MAX_LIVES: 7,
  SPAWN_MARGIN_LEFT: -200,
  SPAWN_MARGIN_RIGHT: 50,

  LOCAL_STORAGE_KEY: 'typingRacer_v1',

 //custom sounds
  SOUNDS: {
    type:       null,   // keystroke click
    correct:    null,   // word destroyed
    incorrect:  null,   // wrong word submitted
    missed:     null,   // word escaped the screen
    powerup:    null,   // power-up collected
    combo:      null,   // combo milestone
    gameOver:   null,   // game over
    music:      null,   // background music loop (overrides procedural; YouTube takes priority)
  },
};
