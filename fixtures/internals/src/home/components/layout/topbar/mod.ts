import { Component, Input } from "@sprig/kit";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/customers": "Customers",
  "/quotes": "Quotes",
  "/contracts": "Contracts",
  "/invoices": "Invoices",
  "/conversations": "Conversations",
  "/settings": "Settings",
};

@Component({
  template: "./mod.html",
})
export class Topbar {
  @Input() currentPath: string = "/";
  @Input() isDemo: boolean = false;

  get normalizedPath(): string {
    return this.isDemo
      ? this.currentPath.replace(/^\/demo/, "") || "/"
      : this.currentPath;
  }

  get title(): string {
    if (pageTitles[this.normalizedPath]) {
      return pageTitles[this.normalizedPath];
    }
    for (const [route, title] of Object.entries(pageTitles)) {
      if (route !== "/" && this.normalizedPath.startsWith(route)) {
        return title;
      }
    }
    return "Admin";
  }
}
