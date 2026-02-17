/**
 * AST node type definitions
 */

import type { SourceLocation } from "../tokenizer/tokens.ts";

/**
 * Base AST node interface
 */
export interface BaseNode {
  /** Source location for error reporting */
  location: SourceLocation;
}

/**
 * Root document node containing all top-level elements
 */
export interface DocumentNode extends BaseNode {
  type: "document";
  children: AstNode[];
}

/**
 * Element node representing an HTML element
 */
export interface ElementNode extends BaseNode {
  type: "element";
  /** Tag name (e.g., "div", "my-component") */
  tagName: string;
  /** Standard HTML attributes */
  attributes: AttributeNode[];
  /** Structural directives (*if, *for, *else, custom) */
  directives: DirectiveNode[];
  /** Property bindings ([prop], [class.x], [style.x], [attr.x]) */
  bindings: BindingNode[];
  /** Event handlers ((click), (submit)) */
  events: EventNode[];
  /** Two-way bindings ([(prop)]) */
  twoWayBindings: TwoWayBindingNode[];
  /** Child nodes */
  children: AstNode[];
  /** Whether element is self-closing */
  selfClosing: boolean;
}

/**
 * Text node representing plain text content
 */
export interface TextNode extends BaseNode {
  type: "text";
  /** Text content */
  content: string;
}

/**
 * Interpolation node representing {{ expression }}
 */
export interface InterpolationNode extends BaseNode {
  type: "interpolation";
  /** Expression inside {{ }} */
  expression: string;
}

/**
 * Comment node representing <!-- comment -->
 */
export interface CommentNode extends BaseNode {
  type: "comment";
  /** Comment content */
  content: string;
}

/**
 * Standard HTML attribute
 */
export interface AttributeNode {
  type: "attribute";
  /** Attribute name */
  name: string;
  /** Attribute value (null for boolean attributes) */
  value: string | null;
  /** Source location */
  location: SourceLocation;
}

/**
 * Structural directive (*if, *for, *else, *custom)
 */
export interface DirectiveNode {
  type: "directive";
  /** Directive name without * (e.g., "if", "for", "highlight") */
  name: string;
  /** Directive expression/value */
  expression: string;
  /** Whether this is a built-in directive (*if, *for, *else) */
  isBuiltIn: boolean;
  /** Source location */
  location: SourceLocation;
}

/**
 * Property/class/style/attribute binding
 */
export interface BindingNode {
  type: "binding";
  /** Binding kind */
  kind: "property" | "class" | "style" | "attribute";
  /** Property/class/style/attribute name */
  name: string;
  /** Binding expression */
  expression: string;
  /** Source location */
  location: SourceLocation;
}

/**
 * Event binding (click), (submit)
 */
export interface EventNode {
  type: "event";
  /** Event name without parentheses (e.g., "click") */
  name: string;
  /** Handler expression */
  handler: string;
  /** Source location */
  location: SourceLocation;
}

/**
 * Two-way binding [(prop)]
 */
export interface TwoWayBindingNode {
  type: "twoWayBinding";
  /** Property name */
  name: string;
  /** Variable/expression for two-way binding */
  expression: string;
  /** Source location */
  location: SourceLocation;
}

/**
 * Union type of all AST nodes
 */
export type AstNode =
  | DocumentNode
  | ElementNode
  | TextNode
  | InterpolationNode
  | CommentNode;

/**
 * Built-in directive names
 */
export const BUILT_IN_DIRECTIVES = new Set(["if", "else", "for"]);

/**
 * Check if a directive is built-in
 */
export function isBuiltInDirective(name: string): boolean {
  return BUILT_IN_DIRECTIVES.has(name);
}

/**
 * Visitor function type for AST traversal
 */
export type AstVisitor<T> = {
  document?: (node: DocumentNode, context: T) => void;
  element?: (node: ElementNode, context: T) => void;
  text?: (node: TextNode, context: T) => void;
  interpolation?: (node: InterpolationNode, context: T) => void;
  comment?: (node: CommentNode, context: T) => void;
};

/**
 * Walk an AST and call visitor functions
 */
export function walkAst<T>(
  node: AstNode,
  visitor: AstVisitor<T>,
  context: T,
): void {
  switch (node.type) {
    case "document":
      visitor.document?.(node, context);
      for (const child of node.children) {
        walkAst(child, visitor, context);
      }
      break;

    case "element":
      visitor.element?.(node, context);
      for (const child of node.children) {
        walkAst(child, visitor, context);
      }
      break;

    case "text":
      visitor.text?.(node, context);
      break;

    case "interpolation":
      visitor.interpolation?.(node, context);
      break;

    case "comment":
      visitor.comment?.(node, context);
      break;
  }
}
