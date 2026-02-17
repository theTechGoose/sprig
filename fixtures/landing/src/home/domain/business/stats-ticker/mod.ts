import { Component } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class StatsTicker {
  items = [
    "30% average revenue increase",
    "Professional quotes in minutes",
    "Contracts with one tap",
    "Invoices that track payments",
    "No apps to download",
    "Just text us",
  ];
}
