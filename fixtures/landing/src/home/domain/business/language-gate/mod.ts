import { Component } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class LanguageGate {
  selected: string | null = null;

  onInit() {
    // Check if language cookie exists
    const match = document.cookie.match(/(?:^|; )lang=(en|es)(?:;|$)/);
    if (match) {
      // Language already set, don't show modal
      this.selected = "hidden";
    }
  }

  pick(lang: string) {
    document.cookie = `lang=${lang}; path=/; max-age=31536000; SameSite=Lax`;
    this.selected = "hidden";
  }

  reset() {
    document.cookie = "lang=; path=/; max-age=0";
    location.reload();
  }
}
