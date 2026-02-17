import { Component, Input } from "@sprig/kit";

interface StatusConfig {
  bg: string;
  text: string;
  ring: string;
  dot: string;
}

const statusColors: Record<string, StatusConfig> = {
  draft: {
    bg: "bg-stone-800/60",
    text: "text-stone-300",
    ring: "ring-stone-700/50",
    dot: "bg-stone-400",
  },
  sent: {
    bg: "bg-blue-950/40",
    text: "text-blue-300",
    ring: "ring-blue-800/30",
    dot: "bg-blue-400",
  },
  accepted: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    ring: "ring-emerald-800/30",
    dot: "bg-emerald-400",
  },
  active: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    ring: "ring-emerald-800/30",
    dot: "bg-emerald-400",
  },
  paid: {
    bg: "bg-emerald-950/40",
    text: "text-emerald-300",
    ring: "ring-emerald-800/30",
    dot: "bg-emerald-400",
  },
  rejected: {
    bg: "bg-red-950/40",
    text: "text-red-300",
    ring: "ring-red-800/30",
    dot: "bg-red-400",
  },
  overdue: {
    bg: "bg-red-950/40",
    text: "text-red-300",
    ring: "ring-red-800/30",
    dot: "bg-red-400",
  },
  pending: {
    bg: "bg-amber-950/40",
    text: "text-amber-300",
    ring: "ring-amber-800/30",
    dot: "bg-amber-400",
  },
};

const defaultColors: StatusConfig = {
  bg: "bg-stone-800/60",
  text: "text-stone-300",
  ring: "ring-stone-700/50",
  dot: "bg-stone-400",
};

@Component({
  template: "./mod.html",
})
export class StatusBadge {
  @Input() status: string = "";
  @Input() showDot: boolean = true;
  @Input() size: "sm" | "md" = "sm";

  get colors(): StatusConfig {
    return statusColors[this.status] ?? defaultColors;
  }

  get badgeClasses(): string {
    const sizeClasses = this.size === "sm"
      ? "px-2.5 py-0.5 text-xs"
      : "px-3 py-1 text-sm";
    return `inline-flex items-center gap-1.5 ${sizeClasses} rounded-full font-medium ${this.colors.bg} ${this.colors.text} ring-1 ${this.colors.ring} transition-all duration-200`;
  }

  get dotClasses(): string {
    return `w-1.5 h-1.5 rounded-full ${this.colors.dot}`;
  }

  get displayStatus(): string {
    return this.status.charAt(0).toUpperCase() + this.status.slice(1);
  }
}
