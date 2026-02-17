import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
})
export class Sidebar {
  @Input() currentPath: string = "/";
  @Input() isDemo: boolean = false;
  @Input() apiBaseUrl: string = "";

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  get homeHref(): string {
    return this.prefix || "/";
  }

  get statusDotClass(): string {
    return this.isDemo
      ? "bg-amber-500 animate-pulse shadow-amber-500/50"
      : "bg-emerald-500 shadow-emerald-500/50";
  }

  get statusText(): string {
    return this.isDemo ? "Demo Mode" : "Connected";
  }
}
