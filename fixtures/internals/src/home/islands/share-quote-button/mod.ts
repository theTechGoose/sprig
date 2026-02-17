import { Component, Input } from "@sprig/kit";

interface ShareOption {
  value: string;
  label: string;
}

@Component({
  template: "./mod.html",
  island: true,
})
export class ShareQuoteButton {
  @Input() quoteId: string = "";
  @Input() prefix: string = "";

  open = false;

  shareOptions: ShareOption[] = [
    { value: "medium", label: "Best Value" },
    { value: "multi", label: "All Options" },
    { value: "low", label: "Budget-Friendly" },
    { value: "high", label: "Premium" },
  ];

  onMount() {
    document.addEventListener("click", this.handleClickOutside.bind(this));
  }

  onDestroy() {
    document.removeEventListener("click", this.handleClickOutside.bind(this));
  }

  handleClickOutside(e: MouseEvent) {
    const container = document.querySelector("[data-share-dropdown]");
    if (container && !container.contains(e.target as Node)) {
      this.open = false;
    }
  }

  toggle() {
    this.open = !this.open;
  }

  getUrl(type: string): string {
    return `${this.prefix}/quotes/${this.quoteId}/present?type=${type}`;
  }

  getFullUrl(type: string): string {
    return `${globalThis.location.origin}${this.getUrl(type)}`;
  }

  handleCopy(type: string) {
    navigator.clipboard.writeText(this.getFullUrl(type));
    this.open = false;
  }

  handleOpen(type: string) {
    navigator.clipboard.writeText(this.getFullUrl(type));
    globalThis.open(this.getUrl(type), "_blank");
    this.open = false;
  }

  handleMainShare() {
    navigator.clipboard.writeText(this.getFullUrl("medium"));
  }
}
