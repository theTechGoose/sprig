import { Component, Input } from "@sprig/kit";

export type GradientVariant = "mesh" | "radial" | "conic" | "dots" | "grid";

@Component({
  template: "./mod.html",
})
export class GradientBackground {
  @Input() class: string = "";
  @Input() variant: GradientVariant = "mesh";

  private variantClasses: Record<GradientVariant, string> = {
    mesh: "gradient-mesh",
    radial: "gradient-radial",
    conic: "gradient-conic",
    dots: "pattern-dots",
    grid: "pattern-grid",
  };

  get containerClass(): string {
    return `relative overflow-hidden ${this.class}`;
  }

  get effectClass(): string {
    return `absolute inset-0 pointer-events-none ${this.variantClasses[this.variant]}`;
  }
}
