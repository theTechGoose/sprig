import { Component, Input } from "@sprig/kit";
import type { Invoice, Contract, Column } from "../../../types/index.ts";

interface InvoiceRow {
  id: string;
  contractId: string;
  amount: string;
  status: string;
  dueDate: string;
}

@Component({
  template: "./mod.html",
})
export class InvoicesPage {
  @Input() invoices: Invoice[] = [];
  @Input() contracts: Contract[] = [];
  @Input() isDemo: boolean = false;
  @Input() contractorId: string = "";

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get cidParam(): string {
    return this.contractorId ? `?contractorId=${this.contractorId}` : "";
  }

  get newInvoiceHref(): string {
    return `${this.prefix}/invoices/new${this.cidParam}`;
  }

  get rowHref(): string {
    return `${this.prefix}/invoices/{id}${this.cidParam}`;
  }

  get rows(): InvoiceRow[] {
    return this.invoices.map((inv) => ({
      id: inv.id,
      contractId: inv.contractId.slice(0, 8),
      amount: `$${inv.amount.toLocaleString()}`,
      status: inv.status,
      dueDate: inv.dueDate,
    }));
  }

  get columns(): Column[] {
    return [
      { key: "contractId", label: "Contract" },
      { key: "amount", label: "Amount" },
      { key: "dueDate", label: "Due Date" },
      { key: "status", label: "Status", renderAs: "status-badge" },
    ];
  }
}
