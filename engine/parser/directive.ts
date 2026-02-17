/**
 * Parser for @Directive decorator
 * Parses custom directive definitions from TypeScript source
 */

export interface DirectiveMetadata {
  /** Directive selector (e.g., "*highlight") */
  selector: string;
  /** Class name of the directive */
  className: string;
}

/**
 * Parse @Directive decorator from TypeScript source
 *
 * @example
 * ```typescript
 * @Directive({
 *   selector: '*highlight'
 * })
 * export class HighlightDirective {
 *   transform(element: Element, color: string) {
 *     return { style: { backgroundColor: color } };
 *   }
 * }
 * ```
 */
export function parseDirectiveDecorator(source: string): DirectiveMetadata | null {
  // Match @Directive({ ... }) decorator
  const decoratorMatch = source.match(
    /@Directive\s*\(\s*\{([\s\S]*?)\}\s*\)/,
  );

  if (!decoratorMatch) {
    return null;
  }

  const decoratorBody = decoratorMatch[1];

  // Extract selector
  const selectorMatch = decoratorBody.match(/selector\s*:\s*["']([^"']+)["']/);
  if (!selectorMatch) {
    return null;
  }

  const selector = selectorMatch[1];

  // Validate selector starts with *
  if (!selector.startsWith("*")) {
    console.warn(`Warning: Directive selector "${selector}" should start with *`);
  }

  // Extract class name
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "UnknownDirective";

  return {
    selector,
    className,
  };
}

/**
 * Check if a source file contains a @Directive decorator
 */
export function hasDirectiveDecorator(source: string): boolean {
  return /@Directive\s*\(/.test(source);
}

/**
 * Get the directive name from its selector
 * @example "*highlight" -> "highlight"
 */
export function getDirectiveName(selector: string): string {
  return selector.startsWith("*") ? selector.slice(1) : selector;
}

/**
 * SprigDirective represents a discovered custom directive
 */
export interface SprigDirective {
  /** Absolute path to the directive file */
  path: string;
  /** Relative path from src/ */
  relativePath: string;
  /** Directive metadata from @Directive decorator */
  metadata: DirectiveMetadata;
  /** TypeScript source code */
  source: string;
}
