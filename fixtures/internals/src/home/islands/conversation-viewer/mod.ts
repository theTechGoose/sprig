import { Component, Input } from "@sprig/kit";
import type { Message } from "../../types/index.ts";
import { conversationsApi } from "../../lib/api/conversations.ts";
import { showToast } from "../../lib/toast-signal.ts";

@Component({
  template: "./mod.html",
  island: true,
})
export class ConversationViewer {
  @Input() customerId: string = "";
  @Input() customerName: string = "";
  @Input() messages: Message[] = [];
  @Input() apiBaseUrl: string = "";
  @Input() isDemo: boolean = false;
  @Input() contractorId: string = "";

  newMessage = "";
  sending = false;

  get api() {
    return conversationsApi(
      { baseUrl: this.apiBaseUrl || "/api/proxy", isDemo: this.isDemo ?? false },
      this.contractorId
    );
  }

  get hasMessages(): boolean {
    return this.messages.length > 0;
  }

  async handleSend(e: Event) {
    e.preventDefault();
    if (!this.newMessage.trim()) return;

    this.sending = true;
    const msg: Message = {
      role: "contractor",
      content: this.newMessage.trim(),
    };
    const result = await this.api.pushMessage(this.customerId, msg);

    this.sending = false;

    if (result.error) {
      showToast(result.error, "error");
    } else {
      this.messages = [...this.messages, msg];
      this.newMessage = "";
    }
  }

  getMessageContainerClass(role: string): string {
    const styles: Record<string, string> = {
      customer: "justify-start",
      contractor: "justify-end",
      assistant: "justify-center",
    };
    return `flex ${styles[role] ?? styles.assistant}`;
  }

  getMessageBubbleClass(role: string): string {
    const styles: Record<string, string> = {
      customer: "chat-bubble-customer",
      contractor: "chat-bubble-contractor",
      assistant: "chat-bubble-assistant",
    };
    return `max-w-[70%] px-4 py-2.5 ${styles[role] ?? styles.assistant}`;
  }

  getMessageLabel(role: string): string {
    if (role === "customer") return this.customerName;
    if (role === "contractor") return "You";
    return "Assistant";
  }

  get canSend(): boolean {
    return !this.sending && !!this.newMessage.trim();
  }

  onMessageInput(e: Event) {
    this.newMessage = (e.target as HTMLInputElement).value;
  }
}
