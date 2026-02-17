import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class SpotlightCard {
  @Input() class: string = "";
  @Input() href: string = "";

  private cardRef: HTMLElement | null = null;

  onMount() {
    this.cardRef = document.querySelector("[data-spotlight-card]") as HTMLElement;
    if (this.cardRef) {
      this.cardRef.addEventListener("mousemove", this.handleMouseMove.bind(this));
    }
  }

  onDestroy() {
    if (this.cardRef) {
      this.cardRef.removeEventListener("mousemove", this.handleMouseMove.bind(this));
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.cardRef) return;
    const rect = this.cardRef.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    this.cardRef.style.setProperty("--spotlight-x", `${x}%`);
    this.cardRef.style.setProperty("--spotlight-y", `${y}%`);
  }

  get baseClasses(): string {
    return `group relative overflow-hidden bg-stone-900 border border-stone-800 rounded-xl transition-all duration-300 hover:border-stone-700 spotlight-container ${this.class}`.trim();
  }

  get hasHref(): boolean {
    return !!this.href;
  }
}
