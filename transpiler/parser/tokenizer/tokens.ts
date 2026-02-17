/**
 * Token type definitions for the Sprig HTML tokenizer
 */

/**
 * Token types for HTML parsing
 */
export enum TokenType {
  // Structural tokens
  TAG_OPEN = "TAG_OPEN", // <
  TAG_CLOSE = "TAG_CLOSE", // >
  TAG_SELF_CLOSE = "TAG_SELF_CLOSE", // />
  TAG_END_OPEN = "TAG_END_OPEN", // </

  // Content tokens
  TAG_NAME = "TAG_NAME", // div, my-component
  ATTR_NAME = "ATTR_NAME", // class, *if, [prop], (click), [(value)]
  ATTR_EQUALS = "ATTR_EQUALS", // =
  ATTR_VALUE = "ATTR_VALUE", // "value" (includes quotes)
  TEXT = "TEXT", // Plain text content
  INTERPOLATION = "INTERPOLATION", // {{ expression }}

  // Special tokens
  COMMENT = "COMMENT", // <!-- comment -->
  WHITESPACE = "WHITESPACE", // spaces, tabs, newlines between tags
  EOF = "EOF", // End of file
}

/**
 * Source location for error reporting
 */
export interface SourceLocation {
  /** Starting line number (1-indexed) */
  line: number;
  /** Starting column number (1-indexed) */
  column: number;
  /** Starting character offset (0-indexed) */
  start: number;
  /** Ending character offset (0-indexed, exclusive) */
  end: number;
}

/**
 * A token produced by the tokenizer
 */
export interface Token {
  /** Token type */
  type: TokenType;
  /** Raw token value */
  value: string;
  /** Source location */
  location: SourceLocation;
}

/**
 * Attribute binding types for special syntax
 */
export enum BindingType {
  /** Standard attribute: attr="value" */
  STANDARD = "STANDARD",
  /** Property binding: [prop]="expr" */
  PROPERTY = "PROPERTY",
  /** Class binding: [class.name]="cond" */
  CLASS = "CLASS",
  /** Style binding: [style.prop]="value" */
  STYLE = "STYLE",
  /** Attribute binding: [attr.name]="value" */
  ATTRIBUTE = "ATTRIBUTE",
  /** Two-way binding: [(prop)]="value" */
  TWO_WAY = "TWO_WAY",
  /** Event binding: (click)="handler()" */
  EVENT = "EVENT",
  /** Structural directive: *if, *for, *else, etc. */
  DIRECTIVE = "DIRECTIVE",
}

/**
 * Parse the attribute name to determine its binding type
 */
export function getBindingType(attrName: string): BindingType {
  if (attrName.startsWith("*")) {
    return BindingType.DIRECTIVE;
  }
  if (attrName.startsWith("[(") && attrName.endsWith(")]")) {
    return BindingType.TWO_WAY;
  }
  if (attrName.startsWith("(") && attrName.endsWith(")")) {
    return BindingType.EVENT;
  }
  if (attrName.startsWith("[class.") && attrName.endsWith("]")) {
    return BindingType.CLASS;
  }
  if (attrName.startsWith("[style.") && attrName.endsWith("]")) {
    return BindingType.STYLE;
  }
  if (attrName.startsWith("[attr.") && attrName.endsWith("]")) {
    return BindingType.ATTRIBUTE;
  }
  if (attrName.startsWith("[") && attrName.endsWith("]")) {
    return BindingType.PROPERTY;
  }
  return BindingType.STANDARD;
}

/**
 * Extract the property name from a binding attribute
 * @example "[prop]" -> "prop"
 * @example "[class.active]" -> "active"
 * @example "(click)" -> "click"
 * @example "*if" -> "if"
 */
export function extractBindingName(attrName: string, type: BindingType): string {
  switch (type) {
    case BindingType.DIRECTIVE:
      return attrName.slice(1); // Remove *
    case BindingType.TWO_WAY:
      return attrName.slice(2, -2); // Remove [( and )]
    case BindingType.EVENT:
      return attrName.slice(1, -1); // Remove ( and )
    case BindingType.CLASS:
      return attrName.slice(7, -1); // Remove [class. and ]
    case BindingType.STYLE:
      return attrName.slice(7, -1); // Remove [style. and ]
    case BindingType.ATTRIBUTE:
      return attrName.slice(6, -1); // Remove [attr. and ]
    case BindingType.PROPERTY:
      return attrName.slice(1, -1); // Remove [ and ]
    default:
      return attrName;
  }
}
