import { Component, Input } from "@sprig/kit";
import type { Invoice, Contract } from "../../types/index.ts";
import { invoicesApi } from "../../lib/api/invoices.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class InvoiceForm {
  @Input() invoice?: Invoice;
  @Input() contracts: Contract[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  contractId = "";
  amount = 0;
  issuedDate = "";
  dueDate = "";
  status = "pending";
  saving = false;
  confirmDelete = false;

  onInit() {
    this.contractId = this.invoice?.contractId ?? (this.contracts[0]?.id ?? "");
    this.amount = this.invoice?.amount ?? 0;
    this.issuedDate = this.invoice?.issuedDate ?? new Date().toISOString().split("T")[0];
    this.dueDate = this.invoice?.dueDate ?? "";
    this.status = this.invoice?.status ?? "pending";
  }

  get isEdit(): boolean {
    return !!this.invoice;
  }

  get api() {
    return invoicesApi({ baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false });
  }

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get submitText(): string {
    if (this.saving) return "Saving...";
    return this.isEdit ? "Update Invoice" : "Create Invoice";
  }

  get statusIconClass(): string {
    const colors: Record<string, string> = {
      pending: "text-amber-500",
      paid: "text-green-500",
      overdue: "text-red-500",
    };
    return colors[this.status] ?? "text-stone-500";
  }

  getContractLabel(c: Contract): string {
    return `${c.id.slice(0, 8)} - ${c.selectedEstimate} estimate`;
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const selectedContract = this.contracts.find((c) => c.id === this.contractId);
    const data = {
      contractorId: selectedContract?.contractorId ?? "",
      contractId: this.contractId,
      amount: this.amount,
      issuedDate: this.issuedDate,
      dueDate: this.dueDate,
      status: this.status,
    };

    const result = this.isEdit && this.invoice
      ? await this.api.update(this.invoice.id, data)
      : await this.api.create(data);

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(this.isEdit ? "Invoice updated" : "Invoice created", "success");
      if (!this.isEdit) globalThis.location.href = `${this.prefix}/invoices`;
    }
  }

  async handleDelete() {
    if (!this.invoice) return;
    const result = await this.api.remove(this.invoice.id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Invoice deleted", "success");
      globalThis.location.href = `${this.prefix}/invoices`;
    }
  }

  showDeleteConfirm() {
    this.confirmDelete = true;
  }

  hideDeleteConfirm() {
    this.confirmDelete = false;
  }

  onContractChange(e: Event) {
    this.contractId = (e.target as HTMLSelectElement).value;
  }

  onAmountInput(e: Event) {
    this.amount = Number((e.target as HTMLInputElement).value);
  }

  onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value;
  }

  onIssuedDateInput(e: Event) {
    this.issuedDate = (e.target as HTMLInputElement).value;
  }

  onDueDateInput(e: Event) {
    this.dueDate = (e.target as HTMLInputElement).value;
  }
}
