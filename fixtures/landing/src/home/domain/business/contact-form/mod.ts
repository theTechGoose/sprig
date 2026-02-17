import { Component } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class ContactForm {
  name = "";
  email = "";
  trade = "";
  submitted = false;
  loading = false;

  async submit() {
    this.loading = true;
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.submitted = true;
    this.loading = false;
  }
}
