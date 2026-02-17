import { Component, Input } from "@sprig/kit";
import { contractsApi } from "../../lib/api/contracts.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class ContractSigner {
  @Input() contractId: string = "";
  @Input() existingSignature: string = "";
  @Input() isSigned: boolean = false;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  saving = false;
  signed = false;
  signatureData = "";

  onInit() {
    this.signed = this.isSigned;
    this.signatureData = this.existingSignature ?? "";
  }

  async handleSave(dataUrl: string) {
    if (!this.contractId) {
      showToast("Contract ID is missing", "error");
      return;
    }

    if (!dataUrl || !dataUrl.startsWith("data:image/")) {
      showToast("Invalid signature data", "error");
      return;
    }

    this.saving = true;
    const api = contractsApi({ baseUrl: "/api/proxy", isDemo: this.isDemo ?? false });

    const result = await api.update(this.contractId, {
      signature: dataUrl,
      status: "active",
    });

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      this.signatureData = dataUrl;
      this.signed = true;
      showToast("Contract signed successfully!", "success");
    }
  }

  get showSignedView(): boolean {
    return this.signed && !!this.signatureData;
  }

  get currentDate(): string {
    return new Date().toLocaleDateString();
  }
}
