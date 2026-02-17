import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class SignaturePad {
  @Input() onSave: ((dataUrl: string) => void) = () => {};
  @Input() onClear: (() => void) | undefined;
  @Input() existingSignature: string = "";
  @Input() disabled: boolean = false;

  hasDrawn = false;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isDrawing = false;
  private lastPoint: { x: number; y: number } | null = null;

  onInit() {
    // Setup will be done after mount
  }

  onMount() {
    this.canvas = document.querySelector("[data-signature-canvas]") as HTMLCanvasElement;
    if (!this.canvas) return;

    this.setupCanvas();
  }

  private setupCanvas() {
    const canvas = this.canvas;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      requestAnimationFrame(() => this.setupCanvas());
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    this.ctx = ctx;

    const dpr = globalThis.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.fillStyle = "rgba(28, 25, 23, 0.8)";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (this.existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height);
      };
      img.src = this.existingSignature;
    }

    this.attachEventListeners();
  }

  private attachEventListeners() {
    const canvas = this.canvas;
    if (!canvas) return;

    canvas.addEventListener("mousedown", this.handleStart.bind(this));
    canvas.addEventListener("mousemove", this.handleMove.bind(this));
    canvas.addEventListener("mouseup", this.handleEnd.bind(this));
    canvas.addEventListener("mouseleave", this.handleEnd.bind(this));
    canvas.addEventListener("touchstart", this.handleStart.bind(this), { passive: false });
    canvas.addEventListener("touchmove", this.handleMove.bind(this), { passive: false });
    canvas.addEventListener("touchend", this.handleEnd.bind(this));
  }

  private getPoint(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
    const canvas = this.canvas;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ("touches" in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ("clientX" in e) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      return null;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  }

  private handleStart(e: MouseEvent | TouchEvent) {
    if (this.disabled) return;
    e.preventDefault();
    this.isDrawing = true;
    this.lastPoint = this.getPoint(e);
  }

  private handleMove(e: MouseEvent | TouchEvent) {
    if (!this.isDrawing || this.disabled) return;
    e.preventDefault();

    const ctx = this.ctx;
    if (!ctx) return;

    const point = this.getPoint(e);
    if (!point || !this.lastPoint) return;

    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(this.lastPoint.x, this.lastPoint.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    this.lastPoint = point;
    this.hasDrawn = true;
  }

  private handleEnd() {
    this.isDrawing = false;
    this.lastPoint = null;
  }

  handleClear() {
    const canvas = this.canvas;
    const ctx = this.ctx;
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(28, 25, 23, 0.8)";
    ctx.fillRect(0, 0, rect.width, rect.height);
    this.hasDrawn = false;
    this.onClear?.();
  }

  handleSave() {
    const canvas = this.canvas;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    this.onSave(dataUrl);
  }

  get canvasClass(): string {
    return `w-full h-48 ${this.disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"}`;
  }

  get showPlaceholder(): boolean {
    return !this.hasDrawn && !this.existingSignature && !this.disabled;
  }
}
