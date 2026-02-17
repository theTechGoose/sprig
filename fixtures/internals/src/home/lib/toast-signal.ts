import { signal } from "@preact/signals";

export interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

export const toasts = signal<Toast[]>([]);

let nextId = 0;

export function showToast(message: string, type: Toast["type"] = "success") {
  const id = nextId++;
  toasts.value = [...toasts.value, { id, message, type }];
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }, 4000);
}

export function dismissToast(id: number) {
  toasts.value = toasts.value.filter((t) => t.id !== id);
}
