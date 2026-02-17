import { Component, Input } from "@sprig/kit";

type GlowColorType = "amber" | "blue" | "green" | "red" | "purple";

const glowColors: Record<GlowColorType, string> = {
  amber: "hover:shadow-amber-500/20",
  blue: "hover:shadow-blue-500/20",
  green: "hover:shadow-green-500/20",
  red: "hover:shadow-red-500/20",
  purple: "hover:shadow-purple-500/20",
};

const borderColors: Record<GlowColorType, string> = {
  amber: "hover:border-amber-500/30",
  blue: "hover:border-blue-500/30",
  green: "hover:border-green-500/30",
  red: "hover:border-red-500/30",
  purple: "hover:border-purple-500/30",
};

@Component({
  template: "./mod.html",
})
export class GlowCard {
  @Input() class: string = "";
  @Input() href: string = "";
  @Input() glowColor: GlowColorType = "amber";

  get hasHref(): boolean {
    return !!this.href;
  }

  get baseClasses(): string {
    return `relative overflow-hidden bg-stone-900 border border-stone-800 rounded-xl transition-all duration-300 ease-out hover:shadow-lg hover:shadow-stone-950/50 hover:-translate-y-0.5 ${glowColors[this.glowColor]} ${borderColors[this.glowColor]} ${this.class}`;
  }
}
