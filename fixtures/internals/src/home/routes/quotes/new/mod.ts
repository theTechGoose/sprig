import { Component, Input } from "@sprig/kit";
import type { Customer } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class NewQuotePage {
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
}
