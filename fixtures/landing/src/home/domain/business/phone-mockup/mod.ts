import { Component, Input } from "@sprig/kit";

interface Message {
  from: "user" | "bot";
  text: string;
  lines?: string[];
}

type Segment = Message[];

const conversations: Record<string, Segment[]> = {
  en: [
    [
      { from: "user", text: "I need a quote for a full kitchen remodel" },
      { from: "bot", text: "On it! What's the scope?" },
      { from: "user", text: "Cabinets, counters, flooring, plumbing -- the works. About 200 sq ft" },
      {
        from: "bot",
        text: "Here's what I've got:",
        lines: [
          "Low:  $18,500",
          "Mid:  $27,000",
          "High: $38,000",
          "",
          "Includes demo, materials, labor.",
          "Send low, mid, or high?",
        ],
      },
      { from: "user", text: "Send the mid" },
      { from: "bot", text: "Customer name?" },
      { from: "user", text: "John Hamilton" },
      { from: "bot", text: "Phone and email?" },
      { from: "user", text: "555-0142, john@email.com" },
      { from: "bot", text: "Quote sent to John Hamilton for $27,000. He'll get a professional PDF with full line items." },
    ],
    [
      { from: "user", text: "Hey remember that quote for John?" },
      { from: "bot", text: "Which one -- John Hamilton or John Pickle?" },
      { from: "user", text: "Hamilton" },
      { from: "bot", text: "Kitchen remodel, $27,000. What do you need?" },
      { from: "user", text: "Send him a contract based on that quote" },
      { from: "bot", text: "Done. Contract sent to john@email.com based on the $27,000 kitchen quote. He can sign digitally." },
    ],
    [
      { from: "user", text: "What's John Pickle's email?" },
      { from: "bot", text: "john.pickle@gmail.com" },
      { from: "user", text: "Send him an invoice based on our last contract" },
      { from: "bot", text: "Invoice for $8,400 sent to John Pickle. I'll let you know when he pays." },
    ],
  ],
  es: [
    [
      { from: "user", text: "Necesito una cotizacion para remodelar una cocina completa" },
      { from: "bot", text: "Dale! Que incluye?" },
      { from: "user", text: "Gabinetes, mesones, piso, plomeria -- todo. Como 200 pies cuadrados" },
      {
        from: "bot",
        text: "Esto es lo que tengo:",
        lines: [
          "Bajo:  $18,500",
          "Medio: $27,000",
          "Alto:  $38,000",
          "",
          "Incluye demo, materiales, mano de obra.",
          "Mando bajo, medio o alto?",
        ],
      },
      { from: "user", text: "Manda el medio" },
      { from: "bot", text: "Nombre del cliente?" },
      { from: "user", text: "Juan Martinez" },
      { from: "bot", text: "Telefono y correo?" },
      { from: "user", text: "555-0142, juan@email.com" },
      { from: "bot", text: "Cotizacion enviada a Juan Martinez por $27,000. Le llega un PDF profesional con todos los detalles." },
    ],
    [
      { from: "user", text: "Oye te acuerdas de la cotizacion de Juan?" },
      { from: "bot", text: "Cual -- Juan Martinez o Juan Lopez?" },
      { from: "user", text: "Martinez" },
      { from: "bot", text: "Remodelacion de cocina, $27,000. Que necesitas?" },
      { from: "user", text: "Mandale un contrato basado en esa cotizacion" },
      { from: "bot", text: "Listo. Contrato enviado a juan@email.com basado en la cotizacion de $27,000. Puede firmar digital." },
    ],
    [
      { from: "user", text: "Cual es el correo de Juan Lopez?" },
      { from: "bot", text: "juan.lopez@gmail.com" },
      { from: "user", text: "Mandale una factura basada en nuestro ultimo contrato" },
      { from: "bot", text: "Factura de $8,400 enviada a Juan Lopez. Te aviso cuando pague." },
    ],
  ],
};

@Component({
  template: "./mod.html",
  island: true,
})
export class PhoneMockup {
  @Input() lang: string = "en";

  // Template refs
  chatRef!: HTMLElement;
  containerRef!: HTMLElement;

  currentSegment = 0;
  visibleCount = 0;
  clearing = false;
  timerRef = 0;
  runId = 0;
  observer: IntersectionObserver | null = null;

  get segments(): Segment[] {
    return conversations[this.lang] || conversations.en;
  }

  get msgs(): Message[] {
    return this.segments[this.currentSegment] || [];
  }

  get visibleMsgs(): Message[] {
    return this.msgs.slice(0, this.visibleCount);
  }

  get showTyping(): boolean {
    return this.visibleCount > 0 &&
           this.visibleCount < this.msgs.length &&
           this.msgs[this.visibleCount]?.from === "bot";
  }

  scrollDown() {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = this.chatRef;
        if (!el) return;
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTo({ top: el.scrollHeight - el.clientHeight, behavior: "smooth" });
        }
      });
    });
  }

  wait(ms: number, id: number): Promise<boolean> {
    return new Promise((resolve) => {
      this.timerRef = setTimeout(() => {
        resolve(this.runId === id);
      }, ms) as unknown as number;
    });
  }

  async runAll(id: number) {
    for (let s = 0; s < this.segments.length; s++) {
      if (this.runId !== id) return;

      if (s > 0) {
        if (!(await this.wait(2000, id))) return;
        this.clearing = true;
        if (!(await this.wait(500, id))) return;
      }

      this.currentSegment = s;
      this.visibleCount = 0;
      this.clearing = false;
      if (this.chatRef) this.chatRef.scrollTop = 0;
      if (!(await this.wait(600, id))) return;

      const msgs = this.segments[s];
      for (let i = 0; i < msgs.length; i++) {
        if (this.runId !== id) return;
        this.visibleCount = i + 1;
        this.scrollDown();
        if (!(await this.wait(1200, id))) return;
      }
    }
  }

  reset() {
    this.runId++;
    clearTimeout(this.timerRef);
    this.currentSegment = 0;
    this.visibleCount = 0;
    this.clearing = false;
    if (this.chatRef) {
      this.chatRef.style.scrollBehavior = "auto";
      this.chatRef.scrollTop = 0;
      this.chatRef.style.scrollBehavior = "";
    }
  }

  onInit() {
    const el = this.containerRef;
    if (!el) return;

    let ready = false;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        ready = true;
      });
    });

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!ready) return;
        if (entry.isIntersecting) {
          this.reset();
          const id = this.runId;
          this.runAll(id);
        } else {
          this.reset();
        }
      },
      { rootMargin: "-25% 0px -25% 0px", threshold: 0 },
    );

    this.observer.observe(el);
  }

  onDestroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    this.reset();
  }
}
