import { Component, Input } from "@sprig/kit";
import type { Contract, Quote, Customer, ContractorProfile, LineItem } from "../../../../types/index.ts";

interface Estimate {
  lineItems: LineItem[];
  estimatedTotal: number;
  timeline?: string;
}

@Component({
  template: "./mod.html",
})
export class ContractSignPage {
  @Input() contract: Contract | null = null;
  @Input() quote: Quote | null = null;
  @Input() customer: Customer | null = null;
  @Input() contractor: ContractorProfile | null = null;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get hasData(): boolean {
    return !!this.contract && !!this.quote;
  }

  get backHref(): string {
    return `${this.prefix}/contracts`;
  }

  get contractDetailHref(): string {
    return `${this.prefix}/contracts/${this.contractId}`;
  }

  get contractId(): string {
    return this.contract?.id ?? "";
  }

  get quoteSummary(): string {
    return this.quote?.summary ?? "";
  }

  get isSigned(): boolean {
    return !!this.contract?.signature && this.contract.signature.startsWith("data:image");
  }

  get existingSignature(): string | undefined {
    return this.isSigned ? this.contract?.signature : undefined;
  }

  get contractorName(): string {
    return this.contractor?.name ?? "—";
  }

  get contractorEmail(): string {
    return this.contractor?.email ?? "";
  }

  get contractorPhone(): string {
    return this.contractor?.phoneNumber ?? "";
  }

  get customerName(): string {
    return this.customer?.name ?? "—";
  }

  get customerEmail(): string {
    return this.customer?.email ?? "";
  }

  get customerPhone(): string {
    return this.customer?.phoneNumber ?? "";
  }

  get estimate(): Estimate | null {
    if (!this.quote || !this.contract) return null;
    const estimateKey = this.contract.selectedEstimate === "medium" ? "fair" : this.contract.selectedEstimate;
    return (this.quote as Record<string, unknown>)[`${estimateKey}Estimate`] as Estimate;
  }

  get lineItems(): LineItem[] {
    return this.estimate?.lineItems ?? [];
  }

  get estimatedTotal(): number {
    return this.estimate?.estimatedTotal ?? 0;
  }

  get timeline(): string {
    return this.estimate?.timeline ?? "";
  }

  get hasTimeline(): boolean {
    return !!this.timeline;
  }

  formatCurrency(amount: number): string {
    return `$${amount.toLocaleString()}`;
  }

  getLineTotal(item: LineItem): string {
    return this.formatCurrency(item.quantity * item.price);
  }
}
