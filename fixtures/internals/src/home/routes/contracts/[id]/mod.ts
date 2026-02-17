import { Component, Input } from "@sprig/kit";
import type { Contract, Quote } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class EditContractPage {
  @Input() contract: Contract | null = null;
  @Input() quotes: Quote[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get backHref(): string {
    return `${this.prefix}/contracts`;
  }

  get hasContract(): boolean {
    return !!this.contract;
  }

  get contractId(): string {
    return this.contract?.id ?? "";
  }

  get signHref(): string {
    return `${this.prefix}/contracts/${this.contractId}/sign`;
  }

  get isSigned(): boolean {
    return !!this.contract?.signature && this.contract.signature.startsWith("data:image");
  }

  get signature(): string {
    return this.contract?.signature ?? "";
  }
}
