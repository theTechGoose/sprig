import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class FlipWords {
  @Input() words: string[] = ["quotes", "contracts", "invoices"];
  @Input() duration: number = 2800;

  currentIndex = 0;
  isAnimating = false;

  ngOnInit() {
    this.startFlipping();
  }

  startFlipping() {
    setInterval(() => {
      this.isAnimating = true;
      setTimeout(() => {
        this.currentIndex = (this.currentIndex + 1) % this.words.length;
        this.isAnimating = false;
      }, 300);
    }, this.duration);
  }
}
