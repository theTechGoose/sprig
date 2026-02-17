import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class DemoResetButton {
  @Input() apiBaseUrl: string = "";

  loading = false;

  async handleReset() {
    this.loading = true;
    try {
      const res = await fetch("/api/proxy/seed/demo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Demo-Mode": "true",
        },
      });
      if (res.ok) {
        const path = globalThis.location.pathname;
        const match = path.match(/^\/demo\/(\w+)\/[^/]+/);
        if (match) {
          globalThis.location.href = `/demo/${match[1]}`;
          return;
        }
        globalThis.location.reload();
      }
    } finally {
      this.loading = false;
    }
  }
}
