import { Component, Input } from "@sprig/kit";
import type { Customer } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class ConversationsPage {
  @Input() customers: Customer[] = [];
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get contractorMessagesHref(): string {
    return `${this.prefix}/conversations/contractor`;
  }

  get hasCustomers(): boolean {
    return this.customers.length > 0;
  }

  getCustomerHref(customer: Customer): string {
    return `${this.prefix}/conversations/${customer.id}`;
  }
}
