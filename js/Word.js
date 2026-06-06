import { CONFIG } from './config.js';

// Pre-built font strings so we're not constructing them every draw call
const FONT_NORMAL = `normal ${CONFIG.WORD_FONT_SIZE}px 'Fredoka', sans-serif`;
const FONT_BOLD   = `600 ${CONFIG.WORD_FONT_SIZE}px 'Fredoka', sans-serif`;

export class Word {
  constructor({ text, x, y, speed, category, canvasWidth, canvasHeight }) {
    this.text = text;
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.category = category;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    this.typedLength = 0;
    this.isMatched = false;
    this.isDestroyed = false;
    this.isMissed = false;

    this.opacity = 0;
    this.fadeInDuration = 400;
    this.fadeInElapsed = 0;

    this.nearEdgeWarning = false;

    this.points = this._calcPoints();
    this.id = `word_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    this._colors = CONFIG.CATEGORY_COLORS[category] || CONFIG.CATEGORY_COLORS.common;
    this.width = text.length * (CONFIG.WORD_FONT_SIZE * 0.62) + CONFIG.WORD_PADDING * 2;
    this.height = CONFIG.WORD_HEIGHT;
  }

  _calcPoints() {
    const base = CONFIG.POINTS.basePerChar * this.text.length;
    const lengthBonus = CONFIG.POINTS.lengthBonus * Math.max(0, this.text.length - 4);
    let catMult = 1;
    if (this.category === 'cs' || this.category === 'programming') catMult = 1.3;
    if (this.category === 'bonus') catMult = CONFIG.POINTS.bonusMultiplier;
    return Math.round((base + lengthBonus) * catMult);
  }

  update(dt, speedMultiplier = 1) {
    if (this.isDestroyed || this.isMissed) return;

    if (this.fadeInElapsed < this.fadeInDuration) {
      this.fadeInElapsed += dt;
      this.opacity = Math.min(1, this.fadeInElapsed / this.fadeInDuration);
    } else {
      this.opacity = 1;
    }

    this.x += this.speed * speedMultiplier * (dt / 1000);

    this.nearEdgeWarning = this.canvasWidth - (this.x + this.width) < 200;

    if (this.x > this.canvasWidth + 10) {
      this.isMissed = true;
    }
  }

  setTypedLength(len) {
    this.typedLength = Math.min(len, this.text.length);
    this.isMatched = this.typedLength > 0;
  }

  isComplete() { return this.typedLength >= this.text.length; }
  destroy()    { this.isDestroyed = true; }

  draw(ctx) {
    if (this.isMissed) return;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const x = this.x;
    const y = this.y;
    const w = this.width;
    const h = this.height;
    const r = 8;
    const px = x - CONFIG.WORD_PADDING;
    const py = y - h / 2 - 4;

    const bgColor = this.nearEdgeWarning ? 'rgba(243,139,168,0.14)' : 'rgba(30,30,46,0.65)';
    ctx.fillStyle = bgColor;
    this._pill(ctx, px, py, w, h, r);
    ctx.fill();

    ctx.lineWidth = this.isMatched ? 1.5 : 1;
    if (this.nearEdgeWarning) {
      ctx.strokeStyle = 'rgba(243,139,168,0.7)';
    } else if (this.isMatched) {
      ctx.strokeStyle = this._colors.base;   // full opacity when matched
    } else {
      ctx.strokeStyle = this._colors.base + '55'; // dimmed when idle
    }
    this._pill(ctx, px, py, w, h, r);
    ctx.stroke();

    ctx.fillStyle = this._colors.base;
    ctx.beginPath();
    ctx.arc(px + 10, y, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = this.isMatched ? FONT_BOLD : FONT_NORMAL;
    ctx.textBaseline = 'middle';

    if (this.typedLength > 0) {
      const typed = this.text.slice(0, this.typedLength);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(typed, x, y);

      const remaining = this.text.slice(this.typedLength);
      const typedW = ctx.measureText(typed).width;
      ctx.fillStyle = this._colors.base;
      ctx.fillText(remaining, x + typedW, y);
    } else {
      ctx.fillStyle = this._colors.base;
      ctx.fillText(this.text, x, y);
    }

    ctx.restore();
  }

  _pill(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x,     y + h, x,     y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x,     y,     x + r, y);
    ctx.closePath();
  }

  getCenterX() { return this.x + this.width / 2; }
  getCenterY() { return this.y; }
}
