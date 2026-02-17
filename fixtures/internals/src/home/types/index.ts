export interface ContractorProfile {
  id: string;
  name: string;
  phoneNumber: string;
  email: string;
}

export interface Customer {
  id: string;
  contractorId: string;
  name: string;
  email: string;
  notes: string;
  phoneNumber: string;
  address: string;
}

export interface LineItem {
  description: string;
  quantity: number;
  unit: string;
  price: number;
}

export interface Estimate {
  lineItems: LineItem[];
  estimatedTotal: number;
  timeline?: string;
}

export interface Quote {
  id: string;
  contractorId: string;
  customerId: string;
  summary: string;
  assumptions?: string[];
  exclusions?: string[];
  lowEstimate: Estimate;
  fairEstimate: Estimate;
  highEstimate: Estimate;
  status: string;
}

export interface Contract {
  id: string;
  contractorId: string;
  quoteId: string;
  selectedEstimate: string;
  status: string;
  signature: string;
}

export interface Invoice {
  id: string;
  contractorId: string;
  contractId: string;
  amount: number;
  dueDate: string;
  issuedDate: string;
  status: string;
}

export interface Message {
  role: "contractor" | "customer" | "assistant";
  content: string;
}

export interface AppEvent {
  id: string;
  contractorId: string;
  type:
    | "quote_request"
    | "contract_signed"
    | "payment_received"
    | "message"
    | "invoice_overdue";
  title: string;
  description: string;
  timestamp: string;
  href: string;
}
