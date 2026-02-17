import { Component, Input } from "@sprig/kit";
import type { Message } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class ContractorMessagesPage {
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
}
