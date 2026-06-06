export class Background {
  constructor(width, height) {
    this.width = width;
    this.height = height;

    this._staticCanvas = document.createElement('canvas');
    this._staticCanvas.width = width;
    this._staticCanvas.height = height;
    this._renderStaticLayer();

    this._rightGrad = null;
  }

  _renderStaticLayer() {
    const ctx = this._staticCanvas.getContext('2d');
    const { width: w, height: h } = this;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1e1e2e');
    grad.addColorStop(1, '#181825');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  update() {}

  draw(ctx) {
    const { width: w, height: h } = this;

    ctx.drawImage(this._staticCanvas, 0, 0);

    if (!this._rightGrad) {
      this._rightGrad = ctx.createLinearGradient(w - 80, 0, w, 0);
      this._rightGrad.addColorStop(0, 'rgba(243,139,168,0)');
      this._rightGrad.addColorStop(1, 'rgba(243,139,168,0.07)');
    }
    ctx.fillStyle = this._rightGrad;
    ctx.fillRect(w - 80, 0, 80, h);

    ctx.strokeStyle = 'rgba(243,139,168,0.28)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(w - 2, 0);
    ctx.lineTo(w - 2, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
