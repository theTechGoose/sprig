import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
})
export class AppLayout {
  @Input() currentPath: string = "/";
  @Input() isDemo: boolean = false;
  @Input() apiBaseUrl: string = "";
}
