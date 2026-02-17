import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class PrintButton {
  @Input() class: string = "";

  print(): void {
    globalThis.print();
  }
}
