import { Component, Input } from "@sprig/kit";

type VariantType = "text" | "circular" | "rectangular" | "card";

const variantClasses: Record<VariantType, string> = {
  text: "h-4 rounded",
  circular: "rounded-full",
  rectangular: "rounded-lg",
  card: "rounded-xl h-32",
};

@Component({
  template: "./mod.html",
})
export class Skeleton {
  @Input() class: string = "";
  @Input() variant: VariantType = "rectangular";
  @Input() width: string = "";
  @Input() height: string = "";

  get variantClass(): string {
    return variantClasses[this.variant];
  }

  get classes(): string {
    return `skeleton-shimmer bg-stone-800/60 ${this.variantClass} ${this.class}`;
  }

  get style(): string {
    const styles: string[] = [];
    if (this.width) styles.push(`width: ${this.width}`);
    if (this.height) styles.push(`height: ${this.height}`);
    return styles.join("; ");
  }
}
