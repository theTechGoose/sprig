import { Component, Input } from "@sprig/kit";
import type { Contract, Quote, Column } from "../../../types/index.ts";

interface ContractRow {
  id: string;
  quoteSummary: string;
  selectedEstimate: string;
  status: string;
}

@Component({
  template: "./mod.html",
})
export class ContractsPage {
  @Input() contracts: Contract[] = [];
  @Input() quotes: Quote[] = [];
  @Input() isDemo: boolean = false;
  @Input() contractorId: string = "";

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get cidParam(): string {
    return this.contractorId ? `?contractorId=${this.contractorId}` : "";
  }

  get rowHref(): string {
    return `${this.prefix}/contracts/{id}${this.cidParam}`;
  }

  get rows(): ContractRow[] {
    return this.contracts.map((c) => {
      const quote = this.quotes.find((q) => q.id === c.quoteId);
      return {
        id: c.id,
        quoteSummary: quote?.summary ?? c.quoteId.slice(0, 8),
        selectedEstimate: c.selectedEstimate,
        status: c.status,
      };
    });
  }

  get columns(): Column[] {
    return [
      { key: "quoteSummary", label: "Quote" },
      { key: "selectedEstimate", label: "Estimate" },
      { key: "status", label: "Status", renderAs: "status-badge" },
    ];
  }
}
