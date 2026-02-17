/**
 * Structural directive transformers (*if, *for)
 * Transforms Angular-like structural directives to JSX control flow
 */

import type { HtmlElement } from "../parser/html.ts";
import { WarningCollector, WarningCodes } from "../utils/warnings.ts";

/**
 * Parsed *for directive expression
 */
export interface ForDirectiveInfo {
  /** Loop variable name (e.g., "item" from "let item of items") */
  itemVar: string;
  /** Iterable expression (e.g., "items" from "let item of items") */
  iterableExpr: string;
  /** Index variable name if specified (e.g., "i" from "index as i") */
  indexVar?: string;
  /** TrackBy expression if specified (e.g., "item.id" from "trackBy: item.id") */
  trackBy?: string;
}

/**
 * Result of parsing a *for expression
 */
export interface ForParseResult {
  info: ForDirectiveInfo | null;
  warnings: string[];
}

/**
 * Parse a *for directive expression
 * Supports: "let item of items", "let item of items; index as i", "let item of items; trackBy: item.id"
 */
export function parseForExpression(expression: string, warnings?: WarningCollector): ForDirectiveInfo | null {
  const trimmed = expression.trim();

  // Check for empty expression
  if (!trimmed) {
    warnings?.warn(
      WarningCodes.EMPTY_FOR_EXPRESSION,
      `*for directive has empty expression`
    );
    return null;
  }

  // Match "let <var> of <expr>" with let required, or "<var> of <expr>" without let
  const withLetMatch = trimmed.match(/^\s*let\s+(\w+)\s+of\s+([^;]+)/);
  const withoutLetMatch = !withLetMatch && trimmed.match(/^\s*(\w+)\s+of\s+([^;]+)/);

  if (!withLetMatch && !withoutLetMatch) {
    // Provide helpful error messages for common mistakes
    if (trimmed.match(/^\s*(?:let\s+)?(\w+)\s+in\s+/)) {
      warnings?.warn(
        WarningCodes.INVALID_FOR_SYNTAX,
        `*for directive uses 'in' instead of 'of'. Expected: *for="let item of items", got: *for="${trimmed}"`
      );
    } else if (trimmed.match(/^\s*let\s+(\w+)\s*$/)) {
      warnings?.warn(
        WarningCodes.INVALID_FOR_SYNTAX,
        `*for directive missing 'of' clause. Expected: *for="let item of items", got: *for="${trimmed}"`
      );
    } else {
      warnings?.warn(
        WarningCodes.INVALID_FOR_SYNTAX,
        `*for directive has invalid syntax. Expected: *for="let item of items" or *for="item of items", got: *for="${trimmed}"`
      );
    }
    return null;
  }

  // Warn if 'let' keyword is missing (still works but not recommended)
  if (withoutLetMatch) {
    warnings?.warn(
      WarningCodes.INVALID_FOR_SYNTAX,
      `*for directive is missing 'let' keyword. Expected: *for="let ${withoutLetMatch[1]} of ${withoutLetMatch[2].trim()}", got: *for="${trimmed}"`
    );
  }

  const basicMatch = (withLetMatch || withoutLetMatch) as RegExpMatchArray;
  const itemVar = basicMatch[1];
  const iterableExpr = basicMatch[2].trim();

  if (!iterableExpr) {
    warnings?.warn(
      WarningCodes.INVALID_FOR_SYNTAX,
      `*for directive has empty iterable expression`
    );
    return null;
  }

  let indexVar: string | undefined;
  let trackBy: string | undefined;

  // Parse additional clauses after the basic "let x of y"
  const remaining = trimmed.slice(basicMatch[0].length);
  const clauses = remaining.split(";").map((s) => s.trim()).filter(Boolean);

  for (const clause of clauses) {
    // Match "index as <var>"
    const indexMatch = clause.match(/^index\s+as\s+(\w+)$/);
    if (indexMatch) {
      indexVar = indexMatch[1];
      continue;
    }

    // Match "let <var> = index" (Angular 17+ style)
    const letIndexMatch = clause.match(/^let\s+(\w+)\s*=\s*index$/);
    if (letIndexMatch) {
      indexVar = letIndexMatch[1];
      continue;
    }

    // Match "trackBy: <expr>"
    const trackByMatch = clause.match(/^trackBy\s*:\s*(.+)$/);
    if (trackByMatch) {
      trackBy = trackByMatch[1].trim();
      continue;
    }

    // Unknown clause
    warnings?.warn(
      WarningCodes.INVALID_FOR_SYNTAX,
      `*for directive has unknown clause: "${clause}". Valid clauses: "index as <var>", "let <var> = index", "trackBy: <expr>"`
    );
  }

  return {
    itemVar,
    iterableExpr,
    indexVar,
    trackBy,
  };
}

/**
 * Generate the key expression for *for directive
 */
export function generateKeyExpression(info: ForDirectiveInfo): string {
  if (info.trackBy) {
    return info.trackBy;
  }
  if (info.indexVar) {
    return info.indexVar;
  }
  // Default to item variable itself as key
  return info.itemVar;
}

/**
 * Transform *if directive to JSX conditional rendering
 * @param elementJsx - The JSX string of the element (without the directive)
 * @param condition - The condition expression
 * @param elseComponent - Optional else component name
 * @returns JSX with conditional rendering
 */
export function transformIfDirective(
  elementJsx: string,
  condition: string,
  elseComponent?: string,
): string {
  if (elseComponent) {
    // Ternary: {condition ? <element /> : <ElseComponent />}
    return `{${condition} ? ${elementJsx} : <${elseComponent} />}`;
  }
  // Simple: {condition && <element />}
  return `{${condition} && ${elementJsx}}`;
}

/**
 * Transform *for directive to JSX map expression
 * @param elementJsx - The JSX string of the element (without the directive, but with key)
 * @param info - Parsed *for directive information
 * @returns JSX with map expression
 */
export function transformForDirective(
  elementJsx: string,
  info: ForDirectiveInfo,
): string {
  // If there's a trackBy, we don't need the index
  // If there's an explicit indexVar, use that
  // Note: Add type annotations to avoid implicit any in strict mode
  let params: string;
  if (info.indexVar) {
    // User-specified index variable - add : number type
    params = `(${info.itemVar}, ${info.indexVar}: number)`;
  } else {
    // No index variable - just use item
    params = `(${info.itemVar})`;
  }

  return `{${info.iterableExpr}.map(${params} => ${elementJsx})}`;
}

/**
 * Check if an element has structural directives
 */
export function hasStructuralDirective(element: HtmlElement): boolean {
  if (!element.directives) return false;
  return element.directives.if !== undefined || element.directives.for !== undefined;
}

/**
 * Extract structural directive from attributes
 * Returns the directive info and removes it from attributes
 */
export function extractStructuralDirectives(
  attributes: Record<string, string>,
): {
  ifCondition?: string;
  elseComponent?: string;
  forExpression?: string;
  remainingAttrs: Record<string, string>;
} {
  const remainingAttrs: Record<string, string> = {};
  let ifCondition: string | undefined;
  let elseComponent: string | undefined;
  let forExpression: string | undefined;

  for (const [key, value] of Object.entries(attributes)) {
    if (key === "*if") {
      ifCondition = value;
    } else if (key === "*else") {
      elseComponent = value;
    } else if (key === "*for") {
      forExpression = value;
    } else {
      remainingAttrs[key] = value;
    }
  }

  return {
    ifCondition,
    elseComponent,
    forExpression,
    remainingAttrs,
  };
}
