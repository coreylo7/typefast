import { CONFIG } from './config.js';

export class Particle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;

    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 140;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - 60;
    this.gravity = 200;

    this.radius = 2 + Math.random() * 4;
    this.lifetime = CONFIG.PARTICLE_LIFETIME;
    this.elapsed = 0;
    this.opacity = 1;
  }

  update(dt) {
    this.elapsed += dt;
    const t = this.elapsed / this.lifetime;
    this.opacity = 1 - t;
    this.vy += this.gravity * (dt / 1000);
    this.x += this.vx * (dt / 1000);
    this.y += this.vy * (dt / 1000);
  }

  isDead() {
    return this.elapsed >= this.lifetime;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = this.opacity;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class FloatingText {
  constructor(x, y, text, color) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.lifetime = CONFIG.FLOATING_TEXT_DURATION;
    this.elapsed = 0;
  }

  update(dt) {
    this.elapsed += dt;
    this.y -= CONFIG.FLOATING_TEXT_RISE * (dt / this.lifetime);
  }

  isDead() {
    return this.elapsed >= this.lifetime;
  }

  draw(ctx) {
    const t = this.elapsed / this.lifetime;
    const opacity = t < 0.2 ? t / 0.2 : 1 - (t - 0.2) / 0.8;

    ctx.save();
    ctx.globalAlpha = Math.max(0, opacity);
    ctx.font = 'bold 20px "JetBrains Mono", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = this.color;
    ctx.fillText(this.text, this.x, this.y);
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  explode(x, y, color, count = CONFIG.PARTICLE_COUNT) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color));
    }
  }

  addFloatingText(x, y, text, color) {
    this.floatingTexts.push(new FloatingText(x, y, text, color));
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(dt);
      if (this.particles[i].isDead()) this.particles.splice(i, 1);
    }
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].update(dt);
      if (this.floatingTexts[i].isDead()) this.floatingTexts.splice(i, 1);
    }
  }

  draw(ctx) {
    this.particles.forEach(p => p.draw(ctx));
    this.floatingTexts.forEach(ft => ft.draw(ctx));
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
  }
}
