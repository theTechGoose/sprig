import { Component } from "@sprig/kit";
import { dismissToast, toasts, type Toast } from "../../lib/toast-signal.ts";

const typeClasses: Record<Toast["type"], string> = {
  success: "bg-green-900/70 backdrop-blur-md border-green-700/60 text-green-200",
  error: "bg-red-900/70 backdrop-blur-md border-red-700/60 text-red-200",
  info: "bg-stone-800/70 backdrop-blur-md border-stone-700/60 text-stone-200",
};

@Component({
  template: "./mod.html",
  island: true,
})
export class ToastContainer {
  get items(): Toast[] {
    return toasts.value;
  }

  get hasItems(): boolean {
    return this.items.length > 0;
  }

  getClasses(toast: Toast): string {
    return `toast-enter flex items-center gap-3 px-4 py-3 rounded-lg border shadow-xl shadow-black/20 min-w-[280px] ${typeClasses[toast.type]}`;
  }

  dismiss(id: number) {
    dismissToast(id);
  }
}
