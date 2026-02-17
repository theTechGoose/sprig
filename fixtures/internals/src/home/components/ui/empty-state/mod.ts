import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
})
export class EmptyState {
  @Input() message: string = "";
  @Input() actionLabel: string = "";
  @Input() actionHref: string = "";

  get showAction(): boolean {
    return !!this.actionLabel && !!this.actionHref;
  }
}
