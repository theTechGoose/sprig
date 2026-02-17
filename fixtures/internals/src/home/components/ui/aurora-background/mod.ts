import { Component, Input } from "@sprig/kit";

export type AuroraIntensity = "subtle" | "medium" | "strong";

@Component({
  template: "./mod.html",
})
export class AuroraBackground {
  @Input() class: string = "";
  @Input() intensity: AuroraIntensity = "subtle";

  private intensityClasses: Record<AuroraIntensity, string> = {
    subtle: "aurora-bg-subtle",
    medium: "aurora-bg-medium",
    strong: "aurora-bg-strong",
  };

  get containerClass(): string {
    return `relative overflow-hidden ${this.class}`;
  }

  get effectClass(): string {
    return `aurora-effect absolute inset-0 pointer-events-none ${this.intensityClasses[this.intensity]}`;
  }
}
