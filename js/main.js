import { Game } from './Game.js';
import { CONFIG } from './config.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.width = CONFIG.CANVAS.WIDTH;
  canvas.height = CONFIG.CANVAS.HEIGHT;

  const game = new Game(canvas);
  game.init();

  window._game = game;
});
