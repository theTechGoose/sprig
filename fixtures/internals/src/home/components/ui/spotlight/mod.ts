import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
})
export class Spotlight {
  @Input() class: string = "";

  get containerClass(): string {
    return `spotlight-container relative ${this.class}`;
  }
}
