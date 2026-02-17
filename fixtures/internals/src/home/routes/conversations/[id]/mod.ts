import { Component, Input } from "@sprig/kit";
import type { Customer, Message } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class ConversationPage {
  @Input() customer: Customer | null = null;
  @Input() customerId: string = "";
  @Input() messages: Message[] = [];
  @Input() contractorId: string = "";
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get backHref(): string {
    return `${this.prefix}/conversations`;
  }

  get hasCustomer(): boolean {
    return !!this.customer;
  }

  get customerName(): string {
    return this.customer?.name ?? "";
  }

  get customerEmail(): string {
    return this.customer?.email ?? "";
  }
}
