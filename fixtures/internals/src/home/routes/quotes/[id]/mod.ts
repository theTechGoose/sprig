import { Component, Input } from "@sprig/kit";
import type { Quote, Customer } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class EditQuotePage {
  @Input() quote: Quote | null = null;
  @Input() customers: Customer[] = [];
  @Input() contractorId: string = "";
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get backHref(): string {
    return `${this.prefix}/quotes`;
  }

  get hasQuote(): boolean {
    return !!this.quote;
  }

  get quoteTitle(): string {
    return this.quote?.summary || "Untitled Quote";
  }

  get quoteId(): string {
    return this.quote?.id ?? "";
  }
}
