import { Component, Input } from "@sprig/kit";
import type { Customer, Estimate, LineItem, Quote } from "../../types/index.ts";
import { quotesApi } from "../../lib/api/quotes.ts";
import { showToast } from "../../lib/toast-signal.ts";

type EstimateTier = "low" | "fair" | "high";

const emptyEstimate: Estimate = {
  lineItems: [{ description: "", quantity: 1, unit: "ea", price: 0 }],
  estimatedTotal: 0,
  timeline: "",
};

@Component({
  template: "./mod.html",
  island: true,
})
export class QuoteEditor {
  @Input() quote?: Quote;
  @Input() customers: Customer[] = [];
  @Input() contractorId: string = "";
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  summary = "";
  customerId = "";
  status = "draft";
  assumptions: string[] = [];
  exclusions: string[] = [];
  lowEstimate: Estimate = structuredClone(emptyEstimate);
  fairEstimate: Estimate = structuredClone(emptyEstimate);
  highEstimate: Estimate = structuredClone(emptyEstimate);
  activeTab: EstimateTier = "fair";
  saving = false;
  confirmDelete = false;
  newAssumption = "";
  newExclusion = "";

  onInit() {
    this.summary = this.quote?.summary ?? "";
    this.customerId = this.quote?.customerId ?? (this.customers[0]?.id ?? "");
    this.status = this.quote?.status ?? "draft";
    this.assumptions = this.quote?.assumptions ?? [];
    this.exclusions = this.quote?.exclusions ?? [];
    this.lowEstimate = this.quote?.lowEstimate ?? structuredClone(emptyEstimate);
    this.fairEstimate = this.quote?.fairEstimate ?? structuredClone(emptyEstimate);
    this.highEstimate = this.quote?.highEstimate ?? structuredClone(emptyEstimate);
  }

  get isEdit(): boolean {
    return !!this.quote;
  }

  get api() {
    return quotesApi({ baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false });
  }

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get submitText(): string {
    if (this.saving) return "Saving...";
    return this.isEdit ? "Update Quote" : "Create Quote";
  }

  getEstimate(tier: EstimateTier): Estimate {
    if (tier === "low") return this.lowEstimate;
    if (tier === "fair") return this.fairEstimate;
    return this.highEstimate;
  }

  getEstimateLabel(tier: EstimateTier): string {
    const labels: Record<EstimateTier, string> = {
      low: "Low",
      fair: "Fair",
      high: "High",
    };
    return labels[tier];
  }

  getTabClass(tier: EstimateTier): string {
    const isActive = this.activeTab === tier;
    return `px-5 py-2 text-sm font-medium rounded-md ${
      isActive
        ? "bg-stone-700 text-amber-400 shadow-sm"
        : "text-stone-500 hover:text-stone-300"
    }`;
  }

  getTabTotalClass(tier: EstimateTier): string {
    const isActive = this.activeTab === tier;
    return isActive ? "text-amber-400/70" : "text-stone-600";
  }

  formatEstimateTotal(tier: EstimateTier): string {
    return "$" + this.getEstimate(tier).estimatedTotal.toLocaleString();
  }

  isActiveTab(tier: EstimateTier): boolean {
    return this.activeTab === tier;
  }

  setActiveTab(tier: EstimateTier) {
    this.activeTab = tier;
  }

  updateLineItems(tier: EstimateTier, items: LineItem[]) {
    const total = items.reduce((s, li) => s + li.quantity * li.price, 0);
    const estimate = { ...this.getEstimate(tier), lineItems: items, estimatedTotal: total };
    if (tier === "low") this.lowEstimate = estimate;
    else if (tier === "fair") this.fairEstimate = estimate;
    else this.highEstimate = estimate;
  }

  updateTimeline(tier: EstimateTier, value: string) {
    const estimate = { ...this.getEstimate(tier), timeline: value };
    if (tier === "low") this.lowEstimate = estimate;
    else if (tier === "fair") this.fairEstimate = estimate;
    else this.highEstimate = estimate;
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const data = {
      contractorId: this.contractorId,
      customerId: this.customerId,
      summary: this.summary,
      assumptions: this.assumptions.length > 0 ? this.assumptions : undefined,
      exclusions: this.exclusions.length > 0 ? this.exclusions : undefined,
      lowEstimate: this.lowEstimate,
      fairEstimate: this.fairEstimate,
      highEstimate: this.highEstimate,
      status: this.status,
    };

    const result = this.isEdit && this.quote
      ? await this.api.update(this.quote.id, data)
      : await this.api.create(data);

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(this.isEdit ? "Quote updated" : "Quote created", "success");
      if (!this.isEdit) globalThis.location.href = `${this.prefix}/quotes`;
    }
  }

  async handleDelete() {
    if (!this.quote) return;
    const result = await this.api.remove(this.quote.id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Quote deleted", "success");
      globalThis.location.href = `${this.prefix}/quotes`;
    }
  }

  showDeleteConfirm() {
    this.confirmDelete = true;
  }

  hideDeleteConfirm() {
    this.confirmDelete = false;
  }

  addAssumption() {
    if (!this.newAssumption.trim()) return;
    this.assumptions = [...this.assumptions, this.newAssumption.trim()];
    this.newAssumption = "";
  }

  removeAssumption(idx: number) {
    this.assumptions = this.assumptions.filter((_, j) => j !== idx);
  }

  addExclusion() {
    if (!this.newExclusion.trim()) return;
    this.exclusions = [...this.exclusions, this.newExclusion.trim()];
    this.newExclusion = "";
  }

  removeExclusion(idx: number) {
    this.exclusions = this.exclusions.filter((_, j) => j !== idx);
  }

  onSummaryInput(e: Event) {
    this.summary = (e.target as HTMLInputElement).value;
  }

  onStatusChange(e: Event) {
    this.status = (e.target as HTMLSelectElement).value;
  }

  onCustomerChange(e: Event) {
    this.customerId = (e.target as HTMLSelectElement).value;
  }

  onNewAssumptionInput(e: Event) {
    this.newAssumption = (e.target as HTMLInputElement).value;
  }

  onNewAssumptionKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.addAssumption();
    }
  }

  onNewExclusionInput(e: Event) {
    this.newExclusion = (e.target as HTMLInputElement).value;
  }

  onNewExclusionKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      this.addExclusion();
    }
  }

  onTimelineInput(tier: EstimateTier, e: Event) {
    this.updateTimeline(tier, (e.target as HTMLInputElement).value);
  }
}
