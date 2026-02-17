import { signal } from "@preact/signals";
import type { AppEvent } from "../types/index.ts";

export const events = signal<AppEvent[]>([]);

export function dismissEvent(id: string) {
  events.value = events.value.filter((e) => e.id !== id);
}

export function getEventsForContractor(contractorId: string) {
  return events.value.filter((e) => e.contractorId === contractorId);
}

export function seedDemoEvents(contractorIds: string[]) {
  const now = Date.now();
  const demoEvents: AppEvent[] = [
    {
      id: crypto.randomUUID(),
      contractorId: contractorIds[0] || "demo",
      type: "quote_request",
      title: "New Quote Request",
      description: "Sarah Johnson requested a quote for kitchen remodel",
      timestamp: new Date(now - 5 * 60000).toISOString(),
      href: "/demo/quotes",
    },
    {
      id: crypto.randomUUID(),
      contractorId: contractorIds[0] || "demo",
      type: "contract_signed",
      title: "Contract Signed",
      description: "Michael Chen signed the bathroom renovation contract",
      timestamp: new Date(now - 15 * 60000).toISOString(),
      href: "/demo/contracts",
    },
    {
      id: crypto.randomUUID(),
      contractorId: contractorIds[0] || "demo",
      type: "payment_received",
      title: "Payment Received",
      description: "$2,500 payment received from Emily Davis",
      timestamp: new Date(now - 45 * 60000).toISOString(),
      href: "/demo/invoices",
    },
    {
      id: crypto.randomUUID(),
      contractorId: contractorIds[1] || contractorIds[0] || "demo",
      type: "message",
      title: "New Message",
      description: "Robert Wilson sent a message about the project timeline",
      timestamp: new Date(now - 2 * 3600000).toISOString(),
      href: "/demo/conversations",
    },
    {
      id: crypto.randomUUID(),
      contractorId: contractorIds[0] || "demo",
      type: "invoice_overdue",
      title: "Invoice Overdue",
      description: "Invoice #1234 is 5 days overdue - $3,200",
      timestamp: new Date(now - 5 * 3600000).toISOString(),
      href: "/demo/invoices",
    },
  ];
  events.value = demoEvents;
}
