import { Component, Input } from "@sprig/kit";
import type { Customer, Quote, Contract, Invoice } from "../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class DashboardPage {
  @Input() customers: Customer[] = [];
  @Input() quotes: Quote[] = [];
  @Input() contracts: Contract[] = [];
  @Input() invoices: Invoice[] = [];
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get activeQuotes(): Quote[] {
    return this.quotes.filter((q) =>
      q.status === "sent" || q.status === "accepted"
    );
  }

  get pendingInvoices(): Invoice[] {
    return this.invoices.filter((i) =>
      i.status === "pending" || i.status === "overdue"
    );
  }

  get activeContracts(): Contract[] {
    return this.contracts.filter((c) => c.status === "active");
  }

  get recentQuotes(): Quote[] {
    return this.quotes.slice(0, 4);
  }

  get recentInvoices(): Invoice[] {
    return this.invoices.slice(0, 4);
  }

  get hasQuotes(): boolean {
    return this.quotes.length > 0;
  }

  get hasInvoices(): boolean {
    return this.invoices.length > 0;
  }

  getCustomerName(customerId: string): string {
    const customer = this.customers.find((c) => c.id === customerId);
    return customer?.name ?? "Unknown Customer";
  }

  formatAmount(amount: number): string {
    return `$${amount.toLocaleString()}`;
  }
}
