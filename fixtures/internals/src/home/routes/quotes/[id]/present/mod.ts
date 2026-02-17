import { Component, Input } from "@sprig/kit";

export type DisplayType = "multi" | "low" | "medium" | "high";

@Component({
  template: "./mod.html",
})
export class QuotePresentPage {
  @Input() quoteId: string = "";
  @Input() isDemo: boolean = false;
  @Input() apiBaseUrl: string = "";
  @Input() displayType: DisplayType | null = null;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get hasValidType(): boolean {
    return this.displayType !== null;
  }
}
