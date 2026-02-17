import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class DocBadge {
  @Input() labels: string[] = ["Quote", "Contract", "Invoice"];
  @Input() badgeLabel: string = "3 documents";
  @Input() headline: string = "One text. Three documents.";
  @Input() subtext: string = "Quote, contract, invoice -- handled.";

  // Template refs
  containerRef!: HTMLElement;
  countRef!: HTMLElement;

  expanded = false;
  counterValue = 0;
  counterRaf = 0;
  observer: IntersectionObserver | null = null;

  colors = ["#22c55e", "#3b82f6", "#f59e0b"];
  linesCounts = [4, 5, 3];

  // Computed values for responsive design
  get isMobile(): boolean {
    return typeof globalThis.innerWidth !== "undefined" && globalThis.innerWidth < 640;
  }

  get cardW(): number {
    return this.isMobile ? 120 : 180;
  }

  get cardH(): number {
    return this.isMobile ? 160 : 240;
  }

  get containerH(): number {
    return this.isMobile ? 190 : 280;
  }

  get fanTransforms(): Array<{ x: number; y: number; rotate: number }> {
    return this.isMobile
      ? [
          { x: -110, y: 0, rotate: -8 },
          { x: 0, y: -20, rotate: 0 },
          { x: 110, y: 0, rotate: 8 },
        ]
      : [
          { x: -220, y: 0, rotate: -8 },
          { x: 0, y: -30, rotate: 0 },
          { x: 220, y: 0, rotate: 8 },
        ];
  }

  onInit() {
    const el = this.containerRef;
    if (!el) return;

    let ready = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ready = true;
      });
    });

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!ready) return;
        if (entry.isIntersecting && !this.expanded) {
          this.expanded = true;
          this.animateCounter("up");
        } else if (!entry.isIntersecting && this.expanded) {
          this.expanded = false;
          this.animateCounter("down");
        }
      },
      { rootMargin: "-25% 0px -25% 0px", threshold: 0 },
    );

    this.observer.observe(el);
  }

  onDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    if (this.counterRaf) {
      cancelAnimationFrame(this.counterRaf);
    }
  }

  animateCounter(direction: "up" | "down") {
    const el = this.countRef;
    if (!el) return;
    if (this.counterRaf) cancelAnimationFrame(this.counterRaf);

    const start = direction === "up" ? 0 : 3;
    const end = direction === "up" ? 3 : 0;
    const duration = direction === "up" ? 800 : 400;
    const delay = direction === "up" ? 500 : 0;

    setTimeout(() => {
      const startTime = performance.now();
      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        this.counterValue = Math.round(start + (end - start) * eased);
        if (el) el.textContent = String(this.counterValue);
        if (progress < 1) {
          this.counterRaf = requestAnimationFrame(tick);
        }
      };
      this.counterRaf = requestAnimationFrame(tick);
    }, delay);
  }
}
