import { Component, Input } from "@sprig/kit";
import type { Quote, Customer, ContractorProfile, Estimate } from "../../types/index.ts";
import { contractsApi } from "../../lib/api/contracts.ts";
import { quotesApi } from "../../lib/api/quotes.ts";
import { customersApi } from "../../lib/api/customers.ts";
import { profileApi } from "../../lib/api/profile.ts";

type DisplayType = "multi" | "low" | "medium" | "high";
type EstimateTier = "low" | "medium" | "high";

const tierLabels: Record<string, string> = {
  low: "Budget-Friendly",
  medium: "Best Value",
  high: "Premium",
};

const tierColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  low: { bg: "bg-blue-500/5", border: "border-blue-500/50", text: "text-blue-400", badge: "bg-blue-500/20 text-blue-400" },
  medium: { bg: "bg-amber-500/5", border: "border-amber-500/50", text: "text-amber-400", badge: "bg-amber-500/20 text-amber-400" },
  high: { bg: "bg-emerald-500/5", border: "border-emerald-500/50", text: "text-emerald-400", badge: "bg-emerald-500/20 text-emerald-400" },
};

@Component({
  template: "./mod.html",
  island: true,
})
export class QuoteAccept {
  @Input() quoteId: string = "";
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;
  @Input() displayType: DisplayType = "multi";
  @Input() prefix: string = "";

  loading = true;
  quote: Quote | null = null;
  customer: Customer | null = null;
  contractor: ContractorProfile | null = null;
  selectedTier: EstimateTier | null = null;
  accepting = false;
  accepted = false;
  contractId: string | null = null;
  error: string | null = null;

  onInit() {
    this.selectedTier = this.displayType === "multi" ? null : this.displayType;
    this.fetchData();
  }

  async fetchData() {
    const config = { baseUrl: "/api/proxy", isDemo: this.isDemo };

    const quoteRes = await quotesApi(config).getById(this.quoteId);
    const quoteData = quoteRes.data as Quote | null;
    this.quote = quoteData;

    if (quoteData) {
      const [customerRes, profileRes] = await Promise.all([
        customersApi(config).getById(quoteData.customerId),
        profileApi(config, quoteData.contractorId).get(),
      ]);
      this.customer = customerRes.data ?? null;
      this.contractor = profileRes.data ?? null;
    }

    const skeleton = document.getElementById("quote-skeleton");
    if (skeleton) skeleton.style.display = "none";

    this.loading = false;
  }

  get customerName(): string {
    return this.customer?.name ?? "Valued Customer";
  }

  get contractorName(): string {
    return this.contractor?.name ?? "Contractor";
  }

  get contractorEmail(): string {
    return this.contractor?.email ?? "";
  }

  get contractorInitials(): string {
    return this.contractorName.split(" ").map(n => n[0]).join("").slice(0, 2);
  }

  get estimates(): { tier: EstimateTier; estimate: Estimate }[] {
    if (!this.quote) return [];
    if (this.displayType === "multi") {
      return [
        { tier: "low", estimate: this.quote.lowEstimate },
        { tier: "medium", estimate: this.quote.fairEstimate },
        { tier: "high", estimate: this.quote.highEstimate },
      ];
    }
    return [{ tier: this.displayType, estimate: this.getEstimate(this.displayType) }];
  }

  get gridClass(): string {
    const len = this.estimates.length;
    if (len === 3) return "grid gap-6 mb-12 md:grid-cols-3";
    if (len === 1) return "grid gap-6 mb-12 max-w-xl mx-auto";
    return "grid gap-6 mb-12 md:grid-cols-2";
  }

  get chooseTitle(): string {
    return this.displayType === "multi" ? "Choose Your Option" : tierLabels[this.displayType];
  }

  get chooseSubtitle(): string {
    return this.displayType === "multi"
      ? "Select the package that best fits your needs and budget"
      : "Review the details below and accept when ready";
  }

  get ctaText(): string {
    return this.selectedTier
      ? `You've selected the ${tierLabels[this.selectedTier]} option. Accept this quote to move forward!`
      : "Select an option above, then click Accept Quote to proceed.";
  }

  get hasAssumptions(): boolean {
    return !!this.quote?.assumptions && this.quote.assumptions.length > 0;
  }

  get hasExclusions(): boolean {
    return !!this.quote?.exclusions && this.quote.exclusions.length > 0;
  }

  getEstimate(tier: EstimateTier): Estimate {
    if (!this.quote) return { lineItems: [], estimatedTotal: 0, timeline: "" };
    if (tier === "medium") return this.quote.fairEstimate;
    return this.quote[`${tier}Estimate` as keyof Quote] as Estimate;
  }

  getTierLabel(tier: EstimateTier): string {
    return tierLabels[tier];
  }

  getTierColor(tier: EstimateTier) {
    return tierColors[tier];
  }

  isSelected(tier: EstimateTier): boolean {
    return this.selectedTier === tier;
  }

  isRecommended(tier: EstimateTier): boolean {
    return tier === "medium" && this.estimates.length > 1;
  }

  selectTier(tier: EstimateTier) {
    this.selectedTier = tier;
  }

  getCardClass(tier: EstimateTier): string {
    const color = tierColors[tier];
    const selected = this.selectedTier === tier;
    return `relative w-full text-left rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
      selected
        ? `${color.border} ${color.bg} scale-[1.02] shadow-2xl`
        : "border-stone-700/40 bg-stone-900/30 hover:border-stone-600/60 hover:scale-[1.01]"
    }`;
  }

  formatTotal(estimate: Estimate): string {
    return "$" + estimate.estimatedTotal.toLocaleString();
  }

  formatLineTotal(item: { quantity: number; price: number }): string {
    return "$" + (item.quantity * item.price).toLocaleString();
  }

  async handleAccept() {
    if (!this.selectedTier || !this.quote) return;

    this.accepting = true;
    this.error = null;

    const config = { baseUrl: "/api/proxy", isDemo: this.isDemo };
    const contractApi = contractsApi(config);
    const quoteApi = quotesApi(config);

    const quoteUpdateResult = await quoteApi.update(this.quote.id, { status: "accepted" });
    if (quoteUpdateResult.error) {
      this.error = quoteUpdateResult.error;
      this.accepting = false;
      return;
    }

    const apiEstimate = this.selectedTier === "medium" ? "fair" : this.selectedTier;
    const result = await contractApi.create({
      contractorId: this.quote.contractorId,
      quoteId: this.quote.id,
      selectedEstimate: apiEstimate,
      status: "pending",
      signature: "",
    });

    if (result.error) {
      await quoteApi.update(this.quote.id, { status: "pending" });
      this.error = result.error;
      this.accepting = false;
      return;
    }

    this.contractId = result.data?.id ?? null;
    this.accepted = true;
    this.accepting = false;
  }

  get canAccept(): boolean {
    return !!this.selectedTier && !this.accepting;
  }

  get signContractUrl(): string {
    return `${this.prefix}/contracts/${this.contractId}/sign`;
  }

  get mailtoUrl(): string {
    return `mailto:${this.contractorEmail}?subject=Question about Quote - ${this.quote?.summary ?? ""}`;
  }
}
