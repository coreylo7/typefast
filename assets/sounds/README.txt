DROP YOUR AUDIO FILES HERE
─────────────────────────
Then open  js/config.js  and fill in the SOUNDS section at the bottom.

Supported formats: mp3, ogg, wav, webm  (use mp3 for widest browser support)

Mapping:
  type       →  played on every keystroke
  correct    →  word successfully destroyed
  incorrect  →  wrong word submitted (Enter with no match)
  missed     →  word escaped the right edge
  powerup    →  power-up word collected
  combo      →  combo milestone reached
  gameOver   →  game over
  music      →  background music loop (overrides procedural ambient music)
               YouTube URL in Settings takes priority over this file.

Example config entry (in js/config.js → CONFIG.SOUNDS):
  type:    'assets/sounds/key-click.mp3',
  correct: 'assets/sounds/ding.mp3',
  music:   'assets/sounds/lofi-bgm.mp3',
