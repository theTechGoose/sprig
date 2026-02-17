import { Component, Input } from "@sprig/kit";
import type { Customer } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class EditCustomerPage {
  @Input() customer: Customer | null = null;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get hasCustomer(): boolean {
    return !!this.customer;
  }
}
