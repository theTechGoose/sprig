import { Component, Input } from "@sprig/kit";
import type { LineItem } from "../../types/index.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class LineItemEditor {
  @Input() items: LineItem[] = [];
  @Input() onChange: ((items: LineItem[]) => void) = () => {};

  updateItem(idx: number, field: keyof LineItem, value: string | number) {
    const updated = [...this.items];
    updated[idx] = { ...updated[idx], [field]: value };
    this.onChange(updated);
  }

  addItem() {
    this.onChange([...this.items, {
      description: "",
      quantity: 1,
      unit: "ea",
      price: 0,
    }]);
  }

  removeItem(idx: number) {
    this.onChange(this.items.filter((_, i) => i !== idx));
  }

  get total(): number {
    return this.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
  }

  get formattedTotal(): string {
    return "$" + this.total.toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  formatLineTotal(item: LineItem): string {
    return "$" + (item.quantity * item.price).toLocaleString("en-US", { minimumFractionDigits: 2 });
  }

  onDescriptionInput(idx: number, e: Event) {
    this.updateItem(idx, "description", (e.target as HTMLInputElement).value);
  }

  onQuantityInput(idx: number, e: Event) {
    this.updateItem(idx, "quantity", Number((e.target as HTMLInputElement).value));
  }

  onUnitInput(idx: number, e: Event) {
    this.updateItem(idx, "unit", (e.target as HTMLInputElement).value);
  }

  onPriceInput(idx: number, e: Event) {
    this.updateItem(idx, "price", Number((e.target as HTMLInputElement).value));
  }
}
