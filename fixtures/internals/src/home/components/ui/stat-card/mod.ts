import { Component, Input } from "@sprig/kit";

type ColorType = "blue" | "amber" | "green" | "red" | "purple";

const colorClasses: Record<ColorType, {
  text: string;
  gradient: string;
  bg: string;
  glow: string;
  border: string;
  iconBg: string;
  iconGlow: string;
  glowColor: string;
}> = {
  blue: {
    text: "text-blue-400",
    gradient: "from-blue-400 via-cyan-300 to-blue-500",
    bg: "bg-blue-500/10",
    glow: "group-hover:shadow-blue-500/20",
    border: "group-hover:border-blue-500/40",
    iconBg: "bg-blue-500/15",
    iconGlow: "group-hover:shadow-blue-500/50",
    glowColor: "rgba(59, 130, 246, 0.5)",
  },
  amber: {
    text: "text-amber-400",
    gradient: "from-amber-400 via-yellow-300 to-orange-500",
    bg: "bg-amber-500/10",
    glow: "group-hover:shadow-amber-500/20",
    border: "group-hover:border-amber-500/40",
    iconBg: "bg-amber-500/15",
    iconGlow: "group-hover:shadow-amber-500/50",
    glowColor: "rgba(245, 158, 11, 0.5)",
  },
  green: {
    text: "text-emerald-400",
    gradient: "from-emerald-400 via-green-300 to-teal-500",
    bg: "bg-emerald-500/10",
    glow: "group-hover:shadow-emerald-500/20",
    border: "group-hover:border-emerald-500/40",
    iconBg: "bg-emerald-500/15",
    iconGlow: "group-hover:shadow-emerald-500/50",
    glowColor: "rgba(16, 185, 129, 0.5)",
  },
  red: {
    text: "text-rose-400",
    gradient: "from-rose-400 via-pink-300 to-red-500",
    bg: "bg-rose-500/10",
    glow: "group-hover:shadow-rose-500/20",
    border: "group-hover:border-rose-500/40",
    iconBg: "bg-rose-500/15",
    iconGlow: "group-hover:shadow-rose-500/50",
    glowColor: "rgba(244, 63, 94, 0.5)",
  },
  purple: {
    text: "text-purple-400",
    gradient: "from-purple-400 via-violet-300 to-indigo-500",
    bg: "bg-purple-500/10",
    glow: "group-hover:shadow-purple-500/20",
    border: "group-hover:border-purple-500/40",
    iconBg: "bg-purple-500/15",
    iconGlow: "group-hover:shadow-purple-500/50",
    glowColor: "rgba(168, 85, 247, 0.5)",
  },
};

@Component({
  template: "./mod.html",
})
export class StatCard {
  @Input() label: string = "";
  @Input() value: string | number = "";
  @Input() href: string = "";
  @Input() trendValue: number | undefined;
  @Input() trendLabel: string = "";
  @Input() color: ColorType = "amber";
  @Input() class: string = "";
  @Input() iconPath: string = "";

  get colors() {
    return colorClasses[this.color];
  }

  get hasHref(): boolean {
    return !!this.href;
  }

  get hasTrend(): boolean {
    return this.trendValue !== undefined;
  }

  get isPositive(): boolean {
    return (this.trendValue ?? 0) >= 0;
  }

  get trendIconClass(): string {
    return this.isPositive ? "" : "rotate-180";
  }

  get trendBgClass(): string {
    return this.isPositive ? "bg-emerald-500/20" : "bg-red-500/20";
  }

  get trendTextClass(): string {
    return this.isPositive ? "text-emerald-400" : "text-red-400";
  }

  get formattedTrend(): string {
    const val = this.trendValue ?? 0;
    return (val >= 0 ? "+" : "") + val + "%";
  }

  get baseClasses(): string {
    return `group relative block p-6 bg-gradient-to-br from-stone-900/90 to-stone-900/70 backdrop-blur-sm border border-stone-800/60 rounded-xl transition-all duration-500 ease-out hover:border-stone-600/60 hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl hover:shadow-stone-950/60 overflow-hidden stat-card-glow ${this.colors.glow} ${this.colors.border} ${this.class}`;
  }

  get glowStyle(): string {
    return `--glow-color: ${this.colors.glowColor}`;
  }

  get valueGradientClass(): string {
    return `text-4xl font-black tracking-tight bg-gradient-to-r ${this.colors.gradient} bg-clip-text text-transparent drop-shadow-sm`;
  }

  get iconContainerClass(): string {
    return `flex-shrink-0 w-14 h-14 rounded-2xl ${this.colors.iconBg} flex items-center justify-center ${this.colors.text} transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg ${this.colors.iconGlow} border border-white/5`;
  }

  get bgGlowClass(): string {
    return `absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${this.colors.bg} blur-2xl scale-110 -z-10`;
  }

  get cornerGlowClass(): string {
    return `absolute -top-10 -right-10 w-32 h-32 ${this.colors.bg} opacity-0 group-hover:opacity-60 blur-3xl pointer-events-none transition-opacity duration-500`;
  }
}
