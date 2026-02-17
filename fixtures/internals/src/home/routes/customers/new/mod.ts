import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
})
export class NewCustomerPage {
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;
}
