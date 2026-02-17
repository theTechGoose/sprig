import { Component, Input } from "@sprig/kit";
import type { Invoice, Contract, Quote, Customer, ContractorProfile, LineItem } from "../../../../types/index.ts";

interface Estimate {
  lineItems: LineItem[];
  estimatedTotal: number;
}

interface StatusConfig {
  color: string;
  label: string;
  icon: string;
}

@Component({
  template: "./mod.html",
})
export class InvoicePresentPage {
  @Input() invoice: Invoice | null = null;
  @Input() contract: Contract | null = null;
  @Input() quote: Quote | null = null;
  @Input() customer: Customer | null = null;
  @Input() contractor: ContractorProfile | null = null;
  @Input() isDemo: boolean = false;

  private statusConfigs: Record<string, StatusConfig> = {
    pending: {
      color: "amber",
      label: "Payment Due",
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    paid: {
      color: "green",
      label: "Paid",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    overdue: {
      color: "red",
      label: "Overdue",
      icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
    },
  };

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get hasInvoice(): boolean {
    return !!this.invoice;
  }

  get backHref(): string {
    return `${this.prefix}/invoices`;
  }

  get invoiceEditHref(): string {
    return `${this.prefix}/invoices/${this.invoice?.id}`;
  }

  get invoiceNumber(): string {
    return this.invoice?.id.slice(0, 8).toUpperCase() ?? "";
  }

  get invoiceAmount(): string {
    return this.invoice ? `$${this.invoice.amount.toLocaleString()}` : "";
  }

  get invoiceStatus(): string {
    return this.invoice?.status ?? "pending";
  }

  get isPaid(): boolean {
    return this.invoiceStatus === "paid";
  }

  get isOverdue(): boolean {
    return this.invoiceStatus === "overdue";
  }

  get statusConfig(): StatusConfig {
    return this.statusConfigs[this.invoiceStatus] || this.statusConfigs.pending;
  }

  get statusLabel(): string {
    return this.statusConfig.label;
  }

  get statusIcon(): string {
    return this.statusConfig.icon;
  }

  get statusColor(): string {
    return this.statusConfig.color;
  }

  get bgClass(): string {
    const colorMap: Record<string, string> = {
      amber: "bg-amber-500/10",
      green: "bg-green-500/10",
      red: "bg-red-500/10",
    };
    return colorMap[this.statusColor] || colorMap.amber;
  }

  get borderClass(): string {
    const colorMap: Record<string, string> = {
      amber: "border-amber-500/30",
      green: "border-green-500/30",
      red: "border-red-500/30",
    };
    return colorMap[this.statusColor] || colorMap.amber;
  }

  get textClass(): string {
    const colorMap: Record<string, string> = {
      amber: "text-amber-400",
      green: "text-green-400",
      red: "text-red-400",
    };
    return colorMap[this.statusColor] || colorMap.amber;
  }

  get dueDate(): Date {
    return new Date(this.invoice?.dueDate ?? Date.now());
  }

  get issuedDate(): Date {
    return new Date(this.invoice?.issuedDate ?? Date.now());
  }

  get dueDateStr(): string {
    return this.dueDate.toLocaleDateString();
  }

  get issuedDateStr(): string {
    return this.issuedDate.toLocaleDateString();
  }

  get daysUntilDue(): number {
    return Math.ceil((this.dueDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  get dueMessage(): string {
    if (this.isPaid) return "Thank you for your payment!";
    if (this.isOverdue) return `Was due on ${this.dueDateStr}`;
    return this.daysUntilDue > 0 ? `Due in ${this.daysUntilDue} days` : "Due today";
  }

  get contractorName(): string {
    return this.contractor?.name ?? "";
  }

  get contractorInitials(): string {
    return this.contractorName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2) || "PM";
  }

  get contractorEmail(): string {
    return this.contractor?.email ?? "";
  }

  get customerName(): string {
    return this.customer?.name ?? "";
  }

  get customerEmail(): string {
    return this.customer?.email ?? "";
  }

  get customerAddress(): string {
    return this.customer?.address ?? "";
  }

  get quoteSummary(): string {
    return this.quote?.summary ?? "";
  }

  get estimate(): Estimate | null {
    if (!this.quote || !this.contract) return null;
    return (this.quote as Record<string, unknown>)[`${this.contract.selectedEstimate}Estimate`] as Estimate;
  }

  get lineItems(): LineItem[] {
    return this.estimate?.lineItems ?? [];
  }

  get hasLineItems(): boolean {
    return this.lineItems.length > 0;
  }

  get emailHref(): string {
    const subject = encodeURIComponent(`Payment for Invoice ${this.invoiceNumber}`);
    const body = encodeURIComponent(
      `Hi ${this.contractorName},\n\nI would like to arrange payment for invoice ${this.invoiceNumber} for ${this.invoiceAmount}.\n\nPlease let me know the payment options available.\n\nThanks!`
    );
    return `mailto:${this.contractorEmail}?subject=${subject}&body=${body}`;
  }

  formatCurrency(amount: number): string {
    return `$${amount.toLocaleString()}`;
  }

  getLineTotal(item: LineItem): string {
    return this.formatCurrency(item.quantity * item.price);
  }
}
