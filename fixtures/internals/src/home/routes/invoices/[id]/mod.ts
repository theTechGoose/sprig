import { Component, Input } from "@sprig/kit";
import type { Invoice, Contract } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class EditInvoicePage {
  @Input() invoice: Invoice | null = null;
  @Input() contracts: Contract[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get backHref(): string {
    return `${this.prefix}/invoices`;
  }

  get hasInvoice(): boolean {
    return !!this.invoice;
  }

  get invoiceId(): string {
    return this.invoice?.id ?? "";
  }

  get invoiceAmount(): string {
    return this.invoice ? `$${this.invoice.amount.toLocaleString()}` : "";
  }

  get presentHref(): string {
    return `${this.prefix}/invoices/${this.invoiceId}/present`;
  }
}
