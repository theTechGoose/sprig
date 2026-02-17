import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class ConfirmDialog {
  @Input() open: boolean = false;
  @Input() title: string = "";
  @Input() message: string = "";
  @Input() onConfirm: () => void = () => {};
  @Input() onCancel: () => void = () => {};

  loading = false;

  handleConfirm() {
    this.loading = true;
    this.onConfirm();
  }

  handleCancel() {
    this.onCancel();
  }

  get buttonText(): string {
    return this.loading ? "Deleting..." : "Delete";
  }
}
