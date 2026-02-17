import { Component, Input } from "@sprig/kit";
import type { Customer } from "../../../types/index.ts";
import type { Column } from "../../../islands/data-table/mod.ts";

@Component({
  template: "./mod.html",
})
export class CustomersPage {
  @Input() customers: Customer[] = [];
  @Input() isDemo: boolean = false;
  @Input() contractorId: string = "";

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get cidParam(): string {
    return this.contractorId ? `?contractorId=${this.contractorId}` : "";
  }

  get newCustomerHref(): string {
    return `${this.prefix}/customers/new${this.cidParam}`;
  }

  get rowHref(): string {
    return `${this.prefix}/customers/{id}${this.cidParam}`;
  }

  get columns(): Column[] {
    return [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phoneNumber", label: "Phone" },
      { key: "address", label: "Address" },
    ];
  }

  get tableData(): Record<string, unknown>[] {
    return this.customers as unknown as Record<string, unknown>[];
  }
}
