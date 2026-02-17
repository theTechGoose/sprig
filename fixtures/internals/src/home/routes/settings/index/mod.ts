import { Component, Input } from "@sprig/kit";
import type { ContractorProfile } from "../../../types/index.ts";

@Component({
  template: "./mod.html",
})
export class SettingsPage {
  @Input() profile: ContractorProfile | null = null;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  get hasProfile(): boolean {
    return !!this.profile;
  }
}
