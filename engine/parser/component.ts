/**
 * Parser for @Component decorator
 */

export interface ComponentMetadata {
  /** Path to template file (default: "./mod.html") */
  template: string;
  /** Path to styling file (optional) */
  styling?: string;
  /** Force island mode (auto-detected if undefined) */
  island?: boolean;
  /** Component class name */
  className: string;
}

/**
 * Parse @Component decorator from TypeScript source
 *
 * Supports:
 * - @Component() - minimal, all defaults
 * - @Component({}) - empty object, all defaults
 * - @Component({ template: './custom.html' }) - with options
 */
export function parseComponentDecorator(
  source: string,
): ComponentMetadata | null {
  // Extract class name first
  const classMatch = source.match(/export\s+class\s+(\w+)/);
  const className = classMatch ? classMatch[1] : "UnknownComponent";

  // Match @Component() with empty parens
  const emptyMatch = source.match(/@Component\s*\(\s*\)/);
  if (emptyMatch) {
    return {
      template: "./mod.html",
      // island: undefined = auto-detect
      className,
    };
  }

  // Match @Component({ ... }) with object
  const decoratorMatch = source.match(
    /@Component\s*\(\s*\{([\s\S]*?)\}\s*\)/,
  );
  if (!decoratorMatch) {
    return null;
  }

  const decoratorBody = decoratorMatch[1];

  // Extract template path (default: "./mod.html")
  const templateMatch = decoratorBody.match(/template\s*:\s*["']([^"']+)["']/);
  const template = templateMatch ? templateMatch[1] : "./mod.html";

  // Extract styling path (optional)
  const stylingMatch = decoratorBody.match(/styling\s*:\s*["']([^"']+)["']/);
  const styling = stylingMatch ? stylingMatch[1] : undefined;

  // Extract island flag (undefined = auto-detect, true/false = explicit)
  const islandMatch = decoratorBody.match(/island\s*:\s*(true|false)/);
  const island = islandMatch ? islandMatch[1] === "true" : undefined;

  return {
    template,
    styling,
    island,
    className,
  };
}
