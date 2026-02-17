/**
 * Custom directive registry and transformer
 * Handles integration of @Directive decorated classes
 */

import type { SprigDirective } from "../parser/mod.ts";
import { getDirectiveName } from "../parser/directive.ts";

/**
 * Registered directive information
 */
export interface RegisteredDirective {
  /** Directive selector without * (e.g., "highlight") */
  selector: string;
  /** Class name (e.g., "HighlightDirective") */
  className: string;
  /** Generated function name (e.g., "applyHighlightDirective") */
  transformFn: string;
  /** Import path for the generated directive file */
  importPath: string;
  /** Original source path */
  sourcePath: string;
}

/**
 * Directive registry for tracking discovered directives
 */
export class DirectiveRegistry {
  private directives: Map<string, RegisteredDirective> = new Map();

  /**
   * Register a directive from a SprigDirective
   */
  register(directive: SprigDirective, outputDir: string): void {
    const selector = getDirectiveName(directive.metadata.selector);
    const className = directive.metadata.className;
    const transformFn = `apply${className}`;

    // Import path is relative to the component that uses it
    const importPath = `@/directives/${selector}.ts`;

    this.directives.set(selector, {
      selector,
      className,
      transformFn,
      importPath,
      sourcePath: directive.path,
    });
  }

  /**
   * Check if a directive is registered
   */
  has(name: string): boolean {
    return this.directives.has(name);
  }

  /**
   * Get a registered directive
   */
  get(name: string): RegisteredDirective | undefined {
    return this.directives.get(name);
  }

  /**
   * Get all registered directives
   */
  getAll(): RegisteredDirective[] {
    return Array.from(this.directives.values());
  }

  /**
   * Clear all registered directives
   */
  clear(): void {
    this.directives.clear();
  }
}

/**
 * Transform a custom directive usage in a template
 *
 * @example
 * // Input: *highlight="'yellow'"
 * // Output: {...applyHighlightDirective({}, 'yellow')}
 */
export function transformCustomDirective(
  directiveName: string,
  expression: string,
  registry: DirectiveRegistry,
): { spreadExpr: string; importInfo: RegisteredDirective } | null {
  const directive = registry.get(directiveName);

  if (!directive) {
    return null;
  }

  // Generate spread expression that applies the directive
  const spreadExpr = `{...${directive.transformFn}({}, ${expression})}`;

  return {
    spreadExpr,
    importInfo: directive,
  };
}

/**
 * Collect all custom directive usages from a template
 */
export function collectCustomDirectiveUsages(
  template: string,
  registry: DirectiveRegistry,
): Set<string> {
  const usages = new Set<string>();

  // Match *directiveName="..."
  const directivePattern = /\*([a-zA-Z][a-zA-Z0-9]*)\s*=\s*["']([^"']*)["']/g;

  let match;
  while ((match = directivePattern.exec(template)) !== null) {
    const directiveName = match[1];

    // Skip built-in directives
    if (directiveName === "if" || directiveName === "for" || directiveName === "else") {
      continue;
    }

    // Check if this is a registered custom directive
    if (registry.has(directiveName)) {
      usages.add(directiveName);
    }
  }

  return usages;
}

/**
 * Generate imports for custom directives used in a template
 */
export function generateDirectiveImports(
  usedDirectives: Set<string>,
  registry: DirectiveRegistry,
): string[] {
  const imports: string[] = [];

  for (const name of usedDirectives) {
    const directive = registry.get(name);
    if (directive) {
      imports.push(
        `import { ${directive.transformFn} } from "${directive.importPath}";`,
      );
    }
  }

  return imports;
}

/**
 * Global directive registry instance
 */
export const directiveRegistry = new DirectiveRegistry();
