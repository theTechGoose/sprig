import { Component, Input } from "@sprig/kit";
import type { Contract } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class NewInvoicePage {
  @Input() contracts: Contract[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get backHref(): string {
    return `${this.prefix}/invoices`;
  }
}
