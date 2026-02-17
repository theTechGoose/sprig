import { Component } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class Effects {
  ngOnInit() {
    // Initialize scroll animations
    this.initScrollAnimations();
  }

  initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-in');
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('[data-animate]').forEach(el => {
      observer.observe(el);
    });
  }
}
