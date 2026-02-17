import { Component, Input } from "@sprig/kit";
import type { Quote, Customer, Column } from "../../../types/index.ts";

interface QuoteRow {
  id: string;
  summary: string;
  customerName: string;
  fairTotal: string;
  status: string;
}

@Component({
  template: "./mod.html",
})
export class QuotesPage {
  @Input() quotes: Quote[] = [];
  @Input() customers: Customer[] = [];
  @Input() isDemo: boolean = false;
  @Input() contractorId: string = "";

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get cidParam(): string {
    return this.contractorId ? `?contractorId=${this.contractorId}` : "";
  }

  get newQuoteHref(): string {
    return `${this.prefix}/quotes/new${this.cidParam}`;
  }

  get rowHref(): string {
    return `${this.prefix}/quotes/{id}${this.cidParam}`;
  }

  get rows(): QuoteRow[] {
    return this.quotes.map((q) => {
      const customer = this.customers.find((c) => c.id === q.customerId);
      return {
        id: q.id,
        summary: q.summary,
        customerName: customer?.name ?? q.customerId,
        fairTotal: `$${q.fairEstimate.estimatedTotal.toLocaleString()}`,
        status: q.status,
      };
    });
  }

  get columns(): Column[] {
    return [
      { key: "summary", label: "Summary" },
      { key: "customerName", label: "Customer" },
      { key: "fairTotal", label: "Fair Estimate" },
      { key: "status", label: "Status", renderAs: "status-badge" },
    ];
  }
}
