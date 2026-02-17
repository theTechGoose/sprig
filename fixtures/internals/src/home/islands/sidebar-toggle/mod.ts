import { Component, Input } from "@sprig/kit";
import { activeContractorId } from "../../lib/contractor-signal.ts";

interface NavItem {
  href: string;
  label: string;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard" },
  { href: "/customers", label: "Customers" },
  { href: "/quotes", label: "Quotes" },
  { href: "/contracts", label: "Contracts" },
  { href: "/invoices", label: "Invoices" },
  { href: "/conversations", label: "Conversations" },
  { href: "/settings", label: "Settings" },
];

@Component({
  template: "./mod.html",
  island: true,
})
export class SidebarToggle {
  @Input() isDemo: boolean = false;

  open = false;

  get items(): NavItem[] {
    return navItems;
  }

  get prefix(): string {
    return this.isDemo ? "/demo" : "";
  }

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }

  buildHref(path: string): string {
    const base = path === "/" ? (this.prefix || "/") : `${this.prefix}${path}`;
    if (activeContractorId.value) {
      return `${base}?contractorId=${activeContractorId.value}`;
    }
    return base;
  }
}
