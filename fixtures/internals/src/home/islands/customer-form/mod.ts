import { Component, Input } from "@sprig/kit";
import type { Customer } from "../../types/index.ts";
import { customersApi } from "../../lib/api/customers.ts";
import { activeContractorId } from "../../lib/contractor-signal.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class CustomerForm {
  @Input() customer?: Customer;
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;

  name = "";
  email = "";
  phoneNumber = "";
  address = "";
  notes = "";
  saving = false;
  confirmDelete = false;

  onInit() {
    if (this.customer) {
      this.name = this.customer.name ?? "";
      this.email = this.customer.email ?? "";
      this.phoneNumber = this.customer.phoneNumber ?? "";
      this.address = this.customer.address ?? "";
      this.notes = this.customer.notes ?? "";
    }
  }

  get isEdit(): boolean {
    return !!this.customer;
  }

  get api() {
    return customersApi({ baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false });
  }

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get submitText(): string {
    if (this.saving) return "Saving...";
    return this.isEdit ? "Update Customer" : "Create Customer";
  }

  get deleteMessage(): string {
    return `Are you sure you want to delete ${this.customer?.name ?? "this customer"}? This action cannot be undone.`;
  }

  async handleSubmit(e: Event) {
    e.preventDefault();
    this.saving = true;

    const data = {
      contractorId: activeContractorId.value,
      name: this.name,
      email: this.email,
      phoneNumber: this.phoneNumber,
      address: this.address,
      notes: this.notes,
    };

    const result = this.isEdit && this.customer
      ? await this.api.update(this.customer.id, data)
      : await this.api.create(data);

    this.saving = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast(this.isEdit ? "Customer updated" : "Customer created", "success");
      if (!this.isEdit) {
        globalThis.location.href = `${this.prefix}/customers`;
      }
    }
  }

  async handleDelete() {
    if (!this.customer) return;
    const result = await this.api.remove(this.customer.id);
    if (result.error) {
      showToast(result.error, "error");
    } else {
      showToast("Customer deleted", "success");
      globalThis.location.href = `${this.prefix}/customers`;
    }
  }

  showDeleteConfirm() {
    this.confirmDelete = true;
  }

  hideDeleteConfirm() {
    this.confirmDelete = false;
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

  onAddressInput(e: Event) {
    this.address = (e.target as HTMLInputElement).value;
  }

  onNotesInput(e: Event) {
    this.notes = (e.target as HTMLTextAreaElement).value;
  }
}
