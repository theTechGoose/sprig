import { Component, Input } from "@sprig/kit";

export interface Column {
  key: string;
  label: string;
  renderAs?: "status-badge" | "signature-image";
  sortable?: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-stone-700 text-stone-300",
  sent: "bg-blue-900/50 text-blue-400",
  accepted: "bg-green-900/50 text-green-400",
  active: "bg-green-900/50 text-green-400",
  paid: "bg-green-900/50 text-green-400",
  rejected: "bg-red-900/50 text-red-400",
  overdue: "bg-red-900/50 text-red-400",
  pending: "bg-amber-900/50 text-amber-400",
};

@Component({
  template: "./mod.html",
  island: true,
})
export class DataTable {
  @Input() columns: Column[] = [];
  @Input() data: Record<string, unknown>[] = [];
  @Input() rowHref: string = "";
  @Input() searchPlaceholder: string = "Search...";
  @Input() searchKeys: string[] = [];
  @Input() emptyMessage: string = "No items found.";

  search = "";
  sortKey = "";
  sortAsc = true;

  get effectiveSearchKeys(): string[] {
    return this.searchKeys.length > 0
      ? this.searchKeys
      : this.columns.map((c) => c.key);
  }

  get filtered(): Record<string, unknown>[] {
    let items = [...this.data];

    if (this.search) {
      const q = this.search.toLowerCase();
      items = items.filter((item) =>
        this.effectiveSearchKeys.some((k) => {
          const val = item[k];
          return val != null && String(val).toLowerCase().includes(q);
        })
      );
    }

    if (this.sortKey) {
      items.sort((a, b) => {
        const aVal = a[this.sortKey] ?? "";
        const bVal = b[this.sortKey] ?? "";
        const cmp = String(aVal).localeCompare(String(bVal), undefined, {
          numeric: true,
        });
        return this.sortAsc ? cmp : -cmp;
      });
    }

    return items;
  }

  get isEmpty(): boolean {
    return this.filtered.length === 0;
  }

  get itemCount(): string {
    return `${this.filtered.length} of ${this.data.length} items`;
  }

  onSearchInput(event: Event) {
    this.search = (event.target as HTMLInputElement).value;
  }

  toggleSort(key: string, sortable?: boolean) {
    if (sortable === false) return;
    if (this.sortKey === key) {
      this.sortAsc = !this.sortAsc;
    } else {
      this.sortKey = key;
      this.sortAsc = true;
    }
  }

  isSortedBy(key: string): boolean {
    return this.sortKey === key;
  }

  getHeaderClasses(col: Column): string {
    const base = "px-8 py-5 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider";
    return col.sortable !== false
      ? `${base} cursor-pointer select-none hover:text-stone-200 transition-colors`
      : base;
  }

  getCellValue(col: Column, item: Record<string, unknown>): string {
    const val = item[col.key];
    return val != null ? String(val) : "";
  }

  isStatusBadge(col: Column): boolean {
    return col.renderAs === "status-badge";
  }

  isSignatureImage(col: Column): boolean {
    return col.renderAs === "signature-image";
  }

  getStatusClasses(val: string): string {
    const base = statusColors[val] ?? "bg-stone-700 text-stone-300";
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${base}`;
  }

  formatStatus(val: string): string {
    return val.charAt(0).toUpperCase() + val.slice(1);
  }

  isValidImage(val: string): boolean {
    return val.startsWith("data:image");
  }

  buildHref(item: Record<string, unknown>): string {
    if (!this.rowHref) return "";
    return this.rowHref.replace(/\{(\w+)\}/g, (_, key) => String(item[key] ?? ""));
  }

  hasRowHref(): boolean {
    return this.rowHref.length > 0;
  }
}
