/**
 * Token -> AST parser
 * Builds an Abstract Syntax Tree from tokens
 */

import {
  Token,
  TokenType,
  BindingType,
  getBindingType,
  extractBindingName,
  type SourceLocation,
} from "../tokenizer/mod.ts";
import {
  type DocumentNode,
  type ElementNode,
  type TextNode,
  type InterpolationNode,
  type CommentNode,
  type AstNode,
  type AttributeNode,
  type DirectiveNode,
  type BindingNode,
  type EventNode,
  type TwoWayBindingNode,
  isBuiltInDirective,
} from "./nodes.ts";

/**
 * Parser error with location information
 */
export class ParseError extends Error {
  constructor(
    message: string,
    public location: SourceLocation,
  ) {
    super(`Parse error at line ${location.line}, column ${location.column}: ${message}`);
  }
}

/**
 * AST Parser for Sprig HTML templates
 */
export class AstParser {
  private tokens: Token[];
  private pos: number = 0;
  private errors: ParseError[] = [];

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  /**
   * Parse tokens into a DocumentNode
   */
  parse(): DocumentNode {
    const children: AstNode[] = [];
    const startLocation = this.currentToken()?.location ?? this.defaultLocation();

    while (!this.isAtEnd()) {
      const node = this.parseNode();
      if (node) {
        children.push(node);
      }
    }

    return {
      type: "document",
      children,
      location: {
        ...startLocation,
        end: this.previousToken()?.location.end ?? startLocation.end,
      },
    };
  }

  /**
   * Get any errors that occurred during parsing
   */
  getErrors(): ParseError[] {
    return this.errors;
  }

  /**
   * Parse a single node
   */
  private parseNode(): AstNode | null {
    const token = this.currentToken();

    if (!token || token.type === TokenType.EOF) {
      return null;
    }

    switch (token.type) {
      case TokenType.TEXT:
        return this.parseText();

      case TokenType.INTERPOLATION:
        return this.parseInterpolation();

      case TokenType.TAG_OPEN:
        return this.parseElement();

      case TokenType.TAG_END_OPEN:
        // Unexpected closing tag at top level - skip it
        this.skipToEndOfTag();
        return null;

      case TokenType.COMMENT:
        return this.parseComment();

      default:
        // Skip unexpected tokens
        this.advance();
        return null;
    }
  }

  /**
   * Parse a text node
   */
  private parseText(): TextNode {
    const token = this.advance();
    return {
      type: "text",
      content: token.value,
      location: token.location,
    };
  }

  /**
   * Parse an interpolation node
   */
  private parseInterpolation(): InterpolationNode {
    const token = this.advance();
    return {
      type: "interpolation",
      expression: token.value,
      location: token.location,
    };
  }

  /**
   * Parse a comment node
   */
  private parseComment(): CommentNode {
    const token = this.advance();
    return {
      type: "comment",
      content: token.value,
      location: token.location,
    };
  }

  /**
   * Parse an element node
   */
  private parseElement(): ElementNode | null {
    const startToken = this.advance(); // Consume TAG_OPEN

    // Get tag name
    const tagNameToken = this.expect(TokenType.TAG_NAME);
    if (!tagNameToken) {
      this.skipToEndOfTag();
      return null;
    }

    const tagName = tagNameToken.value;

    // Parse attributes
    const {
      attributes,
      directives,
      bindings,
      events,
      twoWayBindings,
    } = this.parseAttributes();

    // Check for self-closing or regular close
    const closeToken = this.currentToken();
    let selfClosing = false;

    if (closeToken?.type === TokenType.TAG_SELF_CLOSE) {
      selfClosing = true;
      this.advance();
    } else if (closeToken?.type === TokenType.TAG_CLOSE) {
      this.advance();
    } else {
      // Missing close, try to continue
      this.errors.push(
        new ParseError(`Expected > or /> to close tag <${tagName}>`, tagNameToken.location),
      );
    }

    // Parse children if not self-closing
    const children: AstNode[] = [];

    if (!selfClosing) {
      // Check for void elements (no closing tag needed)
      const voidElements = new Set([
        "area", "base", "br", "col", "embed", "hr", "img", "input",
        "link", "meta", "param", "source", "track", "wbr",
      ]);

      if (!voidElements.has(tagName.toLowerCase())) {
        // Parse children until closing tag
        while (!this.isAtEnd()) {
          const token = this.currentToken();

          // Check for closing tag
          if (token?.type === TokenType.TAG_END_OPEN) {
            const nextToken = this.peek(1);
            if (nextToken?.type === TokenType.TAG_NAME && nextToken.value === tagName) {
              // Found our closing tag
              this.advance(); // TAG_END_OPEN
              this.advance(); // TAG_NAME
              if (this.currentToken()?.type === TokenType.TAG_CLOSE) {
                this.advance(); // TAG_CLOSE
              }
              break;
            }
          }

          // Parse child node
          const child = this.parseNode();
          if (child) {
            children.push(child);
          } else if (this.currentToken()?.type === TokenType.TAG_END_OPEN) {
            // Hit a closing tag that's not ours - probably mismatched
            break;
          }
        }
      }
    }

    return {
      type: "element",
      tagName,
      attributes,
      directives,
      bindings,
      events,
      twoWayBindings,
      children,
      selfClosing,
      location: {
        ...startToken.location,
        end: this.previousToken()?.location.end ?? startToken.location.end,
      },
    };
  }

  /**
   * Parse element attributes
   */
  private parseAttributes(): {
    attributes: AttributeNode[];
    directives: DirectiveNode[];
    bindings: BindingNode[];
    events: EventNode[];
    twoWayBindings: TwoWayBindingNode[];
  } {
    const attributes: AttributeNode[] = [];
    const directives: DirectiveNode[] = [];
    const bindings: BindingNode[] = [];
    const events: EventNode[] = [];
    const twoWayBindings: TwoWayBindingNode[] = [];

    while (this.currentToken()?.type === TokenType.ATTR_NAME) {
      const nameToken = this.advance();
      const attrName = nameToken.value;

      let attrValue: string | null = null;

      // Check for = and value
      if (this.currentToken()?.type === TokenType.ATTR_EQUALS) {
        this.advance(); // Consume =
        const valueToken = this.currentToken();
        if (valueToken?.type === TokenType.ATTR_VALUE) {
          attrValue = valueToken.value;
          this.advance();
        }
      }

      // Determine binding type and create appropriate node
      const bindingType = getBindingType(attrName);

      switch (bindingType) {
        case BindingType.DIRECTIVE: {
          const name = extractBindingName(attrName, bindingType);
          directives.push({
            type: "directive",
            name,
            expression: attrValue ?? "",
            isBuiltIn: isBuiltInDirective(name),
            location: nameToken.location,
          });
          break;
        }

        case BindingType.EVENT: {
          const name = extractBindingName(attrName, bindingType);
          events.push({
            type: "event",
            name,
            handler: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        case BindingType.TWO_WAY: {
          const name = extractBindingName(attrName, bindingType);
          twoWayBindings.push({
            type: "twoWayBinding",
            name,
            expression: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        case BindingType.PROPERTY: {
          const name = extractBindingName(attrName, bindingType);
          bindings.push({
            type: "binding",
            kind: "property",
            name,
            expression: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        case BindingType.CLASS: {
          const name = extractBindingName(attrName, bindingType);
          bindings.push({
            type: "binding",
            kind: "class",
            name,
            expression: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        case BindingType.STYLE: {
          const name = extractBindingName(attrName, bindingType);
          bindings.push({
            type: "binding",
            kind: "style",
            name,
            expression: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        case BindingType.ATTRIBUTE: {
          const name = extractBindingName(attrName, bindingType);
          bindings.push({
            type: "binding",
            kind: "attribute",
            name,
            expression: attrValue ?? "",
            location: nameToken.location,
          });
          break;
        }

        default:
          attributes.push({
            type: "attribute",
            name: attrName,
            value: attrValue,
            location: nameToken.location,
          });
      }
    }

    return { attributes, directives, bindings, events, twoWayBindings };
  }

  /**
   * Skip to the end of the current tag
   */
  private skipToEndOfTag(): void {
    while (!this.isAtEnd()) {
      const token = this.currentToken();
      if (
        token?.type === TokenType.TAG_CLOSE ||
        token?.type === TokenType.TAG_SELF_CLOSE
      ) {
        this.advance();
        return;
      }
      this.advance();
    }
  }

  /**
   * Expect a specific token type
   */
  private expect(type: TokenType): Token | null {
    const token = this.currentToken();
    if (token?.type === type) {
      return this.advance();
    }
    if (token) {
      this.errors.push(
        new ParseError(`Expected ${type} but got ${token.type}`, token.location),
      );
    }
    return null;
  }

  /**
   * Get the current token
   */
  private currentToken(): Token | undefined {
    return this.tokens[this.pos];
  }

  /**
   * Peek at a token at offset from current position
   */
  private peek(offset: number): Token | undefined {
    return this.tokens[this.pos + offset];
  }

  /**
   * Get the previous token
   */
  private previousToken(): Token | undefined {
    return this.tokens[this.pos - 1];
  }

  /**
   * Advance to the next token and return the current one
   */
  private advance(): Token {
    const token = this.tokens[this.pos];
    if (!this.isAtEnd()) {
      this.pos++;
    }
    return token;
  }

  /**
   * Check if we're at the end of tokens
   */
  private isAtEnd(): boolean {
    return this.pos >= this.tokens.length ||
      this.tokens[this.pos].type === TokenType.EOF;
  }

  /**
   * Default source location
   */
  private defaultLocation(): SourceLocation {
    return { line: 1, column: 1, start: 0, end: 0 };
  }
}

/**
 * Parse an HTML string into an AST
 * Note: This requires importing tokenize separately to avoid circular deps
 */
export function parseToAst(tokens: Token[]): DocumentNode {
  const parser = new AstParser(tokens);
  return parser.parse();
}

/**
 * Synchronous version - requires tokens to be passed in
 */
export function parseTokensToAst(tokens: Token[]): DocumentNode {
  const parser = new AstParser(tokens);
  return parser.parse();
}
