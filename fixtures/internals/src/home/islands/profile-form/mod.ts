import { Component, Input } from "@sprig/kit";
import type { ContractorProfile } from "../../types/index.ts";
import { profileApi } from "../../lib/api/profile.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class ProfileForm {
  @Input() profile!: ContractorProfile;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  name = "";
  email = "";
  phoneNumber = "";
  saving = false;

  onInit() {
    this.name = this.profile.name;
    this.email = this.profile.email;
    this.phoneNumber = this.profile.phoneNumber;
  }

  get api() {
    return profileApi(
      { baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false },
      this.profile.id
    );
  }

  get initials(): string {
    return this.name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) || "PM";
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const result = await this.api.update({
      name: this.name,
      email: this.email,
      phoneNumber: this.phoneNumber,
    });

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Profile updated", "success");
    }
  }

  onNameInput(e: Event) {
    this.name = (e.target as HTMLInputElement).value;
  }

  onEmailInput(e: Event) {
    this.email = (e.target as HTMLInputElement).value;
  }

  onPhoneInput(e: Event) {
    this.phoneNumber = (e.target as HTMLInputElement).value;
  }
}
