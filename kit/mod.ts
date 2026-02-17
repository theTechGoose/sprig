/**
 * Sprig Kit - Decorators and utilities for Sprig components
 *
 * Import these in your Sprig app for full LSP support:
 * ```typescript
 * import { Component, Input, Service } from '@sprig/kit';
 * ```
 *
 * These decorators are compile-time only - the Sprig transpiler
 * processes them and generates Fresh/Preact code.
 */

// ============================================================================
// Component Decorator
// ============================================================================

export interface ComponentOptions {
  /** Path to HTML template file (relative to component) */
  template: string;
  /** Whether this component should be an interactive island (default: false) */
  island?: boolean;
  /** CSS/SCSS styles - path or inline */
  styles?: string;
}

/**
 * Marks a class as a Sprig component.
 *
 * @example
 * ```typescript
 * @Component({
 *   template: "./mod.html",
 *   island: true,
 * })
 * export class CounterComponent {
 *   count = 0;
 * }
 * ```
 */
export function Component(_options: ComponentOptions): ClassDecorator {
  // No-op at runtime - transpiler handles this
  return (target) => target;
}

// ============================================================================
// Service Decorator
// ============================================================================

export interface ServiceOptions {
  /** Service scope: 'singleton' (default) or 'transient' */
  scope?: "singleton" | "transient";
  /** Methods to call when DI initializes */
  onStartup?: string[];
}

/**
 * Marks a class as an injectable service.
 *
 * @example
 * ```typescript
 * @Service()
 * export class TranslationsService {
 *   lang = "en";
 * }
 * ```
 */
export function Service(_options?: ServiceOptions): ClassDecorator {
  return (target) => target;
}

// ============================================================================
// Input Decorator
// ============================================================================

export interface InputOptions {
  /** Alias for the input property name in templates */
  alias?: string;
  /** Whether this input is required */
  required?: boolean;
}

/**
 * Marks a property as a component input (prop).
 *
 * @example
 * ```typescript
 * @Component({ template: "./mod.html" })
 * export class ButtonComponent {
 *   @Input() label: string = "Click me";
 *   @Input({ required: true }) onClick!: () => void;
 *   @Input({ alias: "type" }) buttonType: string = "primary";
 * }
 * ```
 */
export function Input(_options?: InputOptions): PropertyDecorator {
  return () => {};
}

// ============================================================================
// Directive Decorator
// ============================================================================

export interface DirectiveOptions {
  /** Directive selector (e.g., "[highlight]" or "*tooltip") */
  selector: string;
}

/**
 * Marks a class as a custom directive.
 *
 * @example
 * ```typescript
 * @Directive({ selector: "[highlight]" })
 * export class HighlightDirective {
 *   apply(element: HTMLElement, value: string) {
 *     element.style.backgroundColor = value;
 *   }
 * }
 * ```
 */
export function Directive(_options: DirectiveOptions): ClassDecorator {
  return (target) => target;
}

// ============================================================================
// Pipe Decorator
// ============================================================================

export interface PipeOptions {
  /** Pipe name used in templates (e.g., "uppercase") */
  name: string;
}

/**
 * Marks a class as a custom pipe.
 *
 * @example
 * ```typescript
 * @Pipe({ name: "currency" })
 * export class CurrencyPipe {
 *   transform(value: number, currency: string = "USD"): string {
 *     return new Intl.NumberFormat("en-US", {
 *       style: "currency",
 *       currency,
 *     }).format(value);
 *   }
 * }
 * ```
 */
export function Pipe(_options: PipeOptions): ClassDecorator {
  return (target) => target;
}

// ============================================================================
// Layout Decorator
// ============================================================================

export interface LayoutOptions {
  /** Path to HTML template file */
  template: string;
}

/**
 * Marks a class as a layout component.
 *
 * @example
 * ```typescript
 * @Layout({ template: "./mod.html" })
 * export class MainLayout {}
 * ```
 */
export function Layout(_options: LayoutOptions): ClassDecorator {
  return (target) => target;
}

// ============================================================================
// Route Decorator
// ============================================================================

export interface RouteOptions {
  /** Path to HTML template file */
  template: string;
  /** Route path (e.g., "/" or "/about") - inferred from folder structure if omitted */
  path?: string;
  /** Layout to use for this route */
  layout?: string;
}

/**
 * Marks a class as a route component.
 *
 * @example
 * ```typescript
 * @Route({ template: "./mod.html" })
 * export class HomePage {}
 * ```
 */
export function Route(_options: RouteOptions): ClassDecorator {
  return (target) => target;
}
