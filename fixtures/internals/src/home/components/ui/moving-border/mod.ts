import { Component, Input } from "@sprig/kit";

export type BorderColor = "amber" | "blue" | "green" | "purple";
export type BorderDuration = "slow" | "normal" | "fast";
export type BorderElement = "button" | "a" | "div";

@Component({
  template: "./mod.html",
})
export class MovingBorder {
  @Input() class: string = "";
  @Input() as: BorderElement = "button";
  @Input() href: string = "";
  @Input() type: "button" | "submit" | "reset" = "button";
  @Input() disabled: boolean = false;
  @Input() borderColor: BorderColor = "amber";
  @Input() duration: BorderDuration = "normal";

  private durationClasses: Record<BorderDuration, string> = {
    slow: "moving-border-slow",
    normal: "moving-border",
    fast: "moving-border-fast",
  };

  get isLink(): boolean {
    return this.as === "a" && !!this.href;
  }

  get isDiv(): boolean {
    return this.as === "div";
  }

  get isButton(): boolean {
    return !this.isLink && !this.isDiv;
  }

  get baseClass(): string {
    return `
      relative inline-flex items-center justify-center
      px-6 py-2.5 rounded-lg
      bg-stone-900 text-stone-100
      font-medium text-sm
      transition-all duration-200
      hover:bg-stone-800
      disabled:opacity-50 disabled:cursor-not-allowed
      ${this.durationClasses[this.duration]}
      ${this.class}
    `.trim().replace(/\s+/g, " ");
  }

  get borderStyle(): string {
    const colorValues: Record<BorderColor, string> = {
      amber: "rgb(245, 158, 11)",
      blue: "rgb(59, 130, 246)",
      green: "rgb(34, 197, 94)",
      purple: "rgb(168, 85, 247)",
    };
    return `--border-color: ${colorValues[this.borderColor]}`;
  }
}
