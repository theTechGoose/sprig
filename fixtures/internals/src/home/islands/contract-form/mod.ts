import { Component, Input } from "@sprig/kit";
import type { Contract, Quote } from "../../types/index.ts";
import { contractsApi } from "../../lib/api/contracts.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class ContractForm {
  @Input() contract?: Contract;
  @Input() quotes: Quote[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  quoteId = "";
  selectedEstimate = "fair";
  status = "pending";
  signature = "";
  saving = false;
  confirmDelete = false;

  onInit() {
    this.quoteId = this.contract?.quoteId ?? (this.quotes[0]?.id ?? "");
    this.selectedEstimate = this.contract?.selectedEstimate ?? "fair";
    this.status = this.contract?.status ?? "pending";
    this.signature = this.contract?.signature ?? "";
  }

  get isEdit(): boolean {
    return !!this.contract;
  }

  get api() {
    return contractsApi({ baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false });
  }

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get submitText(): string {
    if (this.saving) return "Saving...";
    return this.isEdit ? "Update Contract" : "Create Contract";
  }

  get estimateIconClass(): string {
    const colors: Record<string, string> = {
      low: "text-blue-400",
      fair: "text-amber-400",
      high: "text-emerald-400",
    };
    return colors[this.selectedEstimate] ?? "text-stone-500";
  }

  get statusIconClass(): string {
    const colors: Record<string, string> = {
      pending: "text-amber-400",
      active: "text-green-400",
      completed: "text-stone-400",
    };
    return colors[this.status] ?? "text-stone-500";
  }

  getQuoteLabel(q: Quote): string {
    return q.summary || q.id.slice(0, 8);
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const selectedQuote = this.quotes.find((q) => q.id === this.quoteId);
    const data = {
      contractorId: selectedQuote?.contractorId ?? "",
      quoteId: this.quoteId,
      selectedEstimate: this.selectedEstimate,
      status: this.status,
      signature: this.signature,
    };

    const result = this.isEdit && this.contract
      ? await this.api.update(this.contract.id, data)
      : await this.api.create(data);

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(this.isEdit ? "Contract updated" : "Contract created", "success");
      if (!this.isEdit) globalThis.location.href = `${this.prefix}/contracts`;
    }
  }

  async handleDelete() {
    if (!this.contract) return;
    const result = await this.api.remove(this.contract.id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Contract deleted", "success");
      globalThis.location.href = `${this.prefix}/contracts`;
    }
  }

  showDeleteConfirm() {
    this.confirmDelete = true;
  }

  hideDeleteConfirm() {
    this.confirmDelete = false;
  }

  onQuoteChange(e: Event) {
    this.quoteId = (e.target as HTMLSelectElement).value;
  }

  onEstimateChange(e: Event) {
    this.selectedEstimate = (e.target as HTMLSelectElement).value;
  }

  onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value;
  }
}
