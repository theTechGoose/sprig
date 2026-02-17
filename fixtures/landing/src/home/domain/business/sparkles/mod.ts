import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class Sparkles {
  @Input() particleCount: number = 70;
  @Input() particleColor: string = "#f59e0b";
  @Input() minSize: number = 0.8;
  @Input() maxSize: number = 2;
  @Input() speed: number = 0.3;

  canvasRef: HTMLCanvasElement | null = null;
  particles: Array<{
    x: number;
    y: number;
    size: number;
    opacity: number;
    speed: number;
    phase: number;
    drift: number;
  }> = [];
  rafId: number = 0;
  time: number = 0;

  ngOnInit() {
    requestAnimationFrame(() => this.initCanvas());
  }

  ngOnDestroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }

  initCanvas() {
    this.canvasRef = document.querySelector('#sparkles-canvas') as HTMLCanvasElement;
    if (!this.canvasRef) return;

    const ctx = this.canvasRef.getContext('2d');
    if (!ctx) return;

    this.resize(ctx);
    this.initParticles();
    this.draw(ctx);

    globalThis.addEventListener('resize', () => this.resize(ctx));
  }

  resize(ctx: CanvasRenderingContext2D) {
    if (!this.canvasRef) return;
    const dpr = globalThis.devicePixelRatio || 1;
    const rect = this.canvasRef.getBoundingClientRect();
    this.canvasRef.width = rect.width * dpr;
    this.canvasRef.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
  }

  initParticles() {
    if (!this.canvasRef) return;
    const rect = this.canvasRef.getBoundingClientRect();
    this.particles = Array.from({ length: this.particleCount }, () => ({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      size: this.minSize + Math.random() * (this.maxSize - this.minSize),
      opacity: Math.random(),
      speed: 0.2 + Math.random() * this.speed,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.3,
    }));
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.canvasRef) return;
    const rect = this.canvasRef.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    this.time += 0.01;

    for (const p of this.particles) {
      p.y -= p.speed;
      p.x += p.drift;

      const twinkle = Math.sin(this.time * 2 + p.phase) * 0.5 + 0.5;
      const alpha = p.opacity * twinkle;

      if (p.y < -10) {
        p.y = rect.height + 10;
        p.x = Math.random() * rect.width;
      }
      if (p.x < -10) p.x = rect.width + 10;
      if (p.x > rect.width + 10) p.x = -10;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = this.particleColor;
      ctx.globalAlpha = alpha;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    this.rafId = requestAnimationFrame(() => this.draw(ctx));
  }
}
