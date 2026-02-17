import { Component } from "@sprig/kit";
import { activeContractorId } from "../../lib/contractor-signal.ts";
import { dismissEvent, events } from "../../lib/events-signal.ts";
import type { AppEvent } from "../../types/index.ts";

interface TypeInfo {
  icon: string;
  color: string;
}

const typeIcons: Record<string, TypeInfo> = {
  quote_request: {
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    color: "text-blue-400 bg-blue-400/10",
  },
  contract_signed: {
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
    color: "text-green-400 bg-green-400/10",
  },
  payment_received: {
    icon: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    color: "text-emerald-400 bg-emerald-400/10",
  },
  message: {
    icon: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    color: "text-amber-400 bg-amber-400/10",
  },
  invoice_overdue: {
    icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "text-red-400 bg-red-400/10",
  },
};

@Component({
  template: "./mod.html",
  island: true,
})
export class EventQueue {
  open = false;

  get allEvents(): AppEvent[] {
    return events.value;
  }

  get count(): number {
    return events.value.length;
  }

  get hasEvents(): boolean {
    return this.count > 0;
  }

  get countLabel(): string {
    return `${this.count} pending ${this.count === 1 ? "event" : "events"} across all contractors`;
  }

  toggle() {
    this.open = !this.open;
  }

  close() {
    this.open = false;
  }

  getTypeInfo(type: string): TypeInfo {
    return typeIcons[type] ?? typeIcons.message;
  }

  getEventHref(evt: AppEvent): string {
    return evt.contractorId ? `${evt.href}?contractorId=${evt.contractorId}` : evt.href;
  }

  handleEventClick(evt: AppEvent) {
    activeContractorId.value = evt.contractorId;
    dismissEvent(evt.id);
  }

  clearAll() {
    this.allEvents.forEach((e) => dismissEvent(e.id));
  }

  timeAgo(timestamp: string): string {
    const diff = Date.now() - new Date(timestamp).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
