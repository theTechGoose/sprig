import { Component, Input } from "@sprig/kit";

export type BentoCols = 1 | 2 | 3 | 4;
export type BentoSpan = 1 | 2;

@Component({
  template: "./mod.html",
  selector: "BentoGrid",
})
export class BentoGrid {
  @Input() class: string = "";
  @Input() cols: BentoCols = 4;

  private colClasses: Record<BentoCols, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };

  get gridClass(): string {
    return `grid ${this.colClasses[this.cols]} gap-4 ${this.class}`;
  }
}

@Component({
  template: "./item.html",
  selector: "BentoGridItem",
})
export class BentoGridItem {
  @Input() class: string = "";
  @Input() colSpan: BentoSpan = 1;
  @Input() rowSpan: BentoSpan = 1;

  get itemClass(): string {
    const colSpanClass = this.colSpan === 2 ? "sm:col-span-2" : "";
    const rowSpanClass = this.rowSpan === 2 ? "row-span-2" : "";
    return `${colSpanClass} ${rowSpanClass} ${this.class}`.trim();
  }
}
