import { Component, Input } from "@sprig/kit";

/**
 * Demo module app layout - sets isDemo=true for all demo routes.
 * This module mirrors the home module structure but with demo mode enabled.
 */
@Component({
  template: "./mod.html",
})
export class DemoApp {
  @Input() isDemo: boolean = true; // Always true for demo routes
  @Input() apiBaseUrl: string = "";
  @Input() contractorId: string = "";
}
