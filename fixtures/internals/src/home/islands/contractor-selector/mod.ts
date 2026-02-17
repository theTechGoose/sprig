import { Component, Input } from "@sprig/kit";
import { activeContractorId } from "../../lib/contractor-signal.ts";
import { profileApi } from "../../lib/api/profile.ts";
import { seedDemoEvents, events } from "../../lib/events-signal.ts";
import type { ContractorProfile } from "../../types/index.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class ContractorSelector {
  @Input() isDemo: boolean = false;
  @Input() apiBaseUrl: string = "";

  open = false;
  search = "";
  contractors: ContractorProfile[] = [];

  onInit() {
    const storageKey = this.isDemo ? "demo-contractor-id" : "contractor-id";
    const urlCid = new URL(globalThis.location.href).searchParams.get("contractorId");
    const storedCid = globalThis.localStorage?.getItem(storageKey);

    if (urlCid) {
      activeContractorId.value = urlCid;
      globalThis.localStorage?.setItem(storageKey, urlCid);
    } else if (storedCid) {
      activeContractorId.value = storedCid;
    }

    const config = { baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false };
    profileApi(config).list().then((res) => {
      const list = (res.data ?? []) as ContractorProfile[];
      this.contractors = list;

      if (activeContractorId.value) {
        const exists = list.some(p => p.id === activeContractorId.value);
        if (!exists && list.length > 0) {
          activeContractorId.value = list[0].id;
          globalThis.localStorage?.setItem(storageKey, list[0].id);
        }
      } else if (list.length > 0) {
        activeContractorId.value = list[0].id;
        globalThis.localStorage?.setItem(storageKey, list[0].id);
      }

      if (this.isDemo && list.length > 0 && events.value.length === 0) {
        seedDemoEvents(list.map(p => p.id));
      }
    });
  }

  get current(): ContractorProfile | undefined {
    return this.contractors.find((c) => c.id === activeContractorId.value) ?? this.contractors[0];
  }

  get hasCurrent(): boolean {
    return !!this.current;
  }

  get filtered(): ContractorProfile[] {
    if (!this.search) return this.contractors;
    const q = this.search.toLowerCase();
    return this.contractors.filter((c) =>
      c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q)
    );
  }

  get chevronClass(): string {
    return `w-4 h-4 text-stone-500 flex-shrink-0 transition-transform ${this.open ? "rotate-180" : ""}`;
  }

  getInitials(name: string): string {
    return name.split(" ").map((w) => w[0]).join("").slice(0, 2);
  }

  isActive(id: string): boolean {
    return id === activeContractorId.value;
  }

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
    this.search = "";
  }

  select(id: string) {
    const storageKey = this.isDemo ? "demo-contractor-id" : "contractor-id";
    activeContractorId.value = id;
    globalThis.localStorage?.setItem(storageKey, id);
    this.open = false;
    this.search = "";
    const url = new URL(globalThis.location.href);
    url.searchParams.set("contractorId", id);
    globalThis.location.href = url.toString();
  }

  onSearchInput(e: Event) {
    this.search = (e.target as HTMLInputElement).value;
  }
}
