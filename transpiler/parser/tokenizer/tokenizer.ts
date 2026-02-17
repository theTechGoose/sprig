/**
 * Character scanner -> tokens
 * Tokenizes HTML with support for Sprig template syntax
 */

import { Token, TokenType, type SourceLocation } from "./tokens.ts";

/**
 * Tokenizer state machine states
 */
enum State {
  DATA, // Outside of tags, parsing text
  TAG_OPEN, // Just saw <
  TAG_NAME, // Reading tag name
  TAG_CLOSE_PENDING, // After tag name, before > (no attrs)
  TAG_CLOSE_PENDING_FROM_ATTR, // After attr name, before > (no value)
  BEFORE_ATTR_NAME, // Whitespace before attribute name
  ATTR_NAME, // Reading attribute name
  ATTR_EQUALS_PENDING, // After attr name, before =
  AFTER_ATTR_NAME, // Whitespace after attribute name
  BEFORE_ATTR_VALUE, // After = before value
  ATTR_VALUE_QUOTED, // Inside quoted attribute value
  ATTR_VALUE_UNQUOTED, // Unquoted attribute value
  SELF_CLOSING_TAG, // Just saw /
  END_TAG_OPEN, // Just saw </
  END_TAG_NAME, // Reading end tag name
  END_TAG_CLOSE, // After end tag name, before >
  COMMENT, // Inside comment
  COMMENT_END, // Possible end of comment (-)
  COMMENT_END_BANG, // Possible end of comment (--)
}

/**
 * Tokenizer for Sprig HTML templates
 */
export class Tokenizer {
  private source: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;
  private state: State = State.DATA;

  // Current token being built
  private tokenStart: number = 0;
  private tokenStartLine: number = 1;
  private tokenStartColumn: number = 1;
  private tokenValue: string = "";

  // For attribute parsing
  private quoteChar: string = "";
  private currentAttrName: string = "";

  constructor(source: string) {
    this.source = source;
  }

  /**
   * Tokenize the entire source and return all tokens
   */
  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.pos < this.source.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    // Add EOF token
    tokens.push(this.createToken(TokenType.EOF, ""));

    return tokens;
  }

  /**
   * Get the next token from the source
   */
  private nextToken(): Token | null {
    this.tokenStart = this.pos;
    this.tokenStartLine = this.line;
    this.tokenStartColumn = this.column;
    this.tokenValue = "";

    switch (this.state) {
      case State.DATA:
        return this.parseData();

      case State.TAG_OPEN:
        return this.parseTagOpen();

      case State.TAG_NAME:
        return this.parseTagName();

      case State.TAG_CLOSE_PENDING:
        return this.parseTagClosePending();

      case State.BEFORE_ATTR_NAME:
        return this.parseBeforeAttrName();

      case State.ATTR_NAME:
        return this.parseAttrName();

      case State.ATTR_EQUALS_PENDING:
        return this.parseAttrEqualsPending();

      case State.TAG_CLOSE_PENDING_FROM_ATTR:
        return this.parseTagClosePendingFromAttr();

      case State.AFTER_ATTR_NAME:
        return this.parseAfterAttrName();

      case State.BEFORE_ATTR_VALUE:
        return this.parseBeforeAttrValue();

      case State.ATTR_VALUE_QUOTED:
        return this.parseAttrValueQuoted();

      case State.ATTR_VALUE_UNQUOTED:
        return this.parseAttrValueUnquoted();

      case State.SELF_CLOSING_TAG:
        return this.parseSelfClosingTag();

      case State.END_TAG_OPEN:
        return this.parseEndTagOpen();

      case State.END_TAG_NAME:
        return this.parseEndTagName();

      case State.END_TAG_CLOSE:
        return this.parseEndTagClose();

      case State.COMMENT:
        return this.parseComment();

      case State.COMMENT_END:
        return this.parseCommentEnd();

      case State.COMMENT_END_BANG:
        return this.parseCommentEndBang();

      default:
        throw new Error(`Unknown state: ${this.state}`);
    }
  }

  /**
   * Parse text content and interpolations
   */
  private parseData(): Token | null {
    const startPos = this.pos;

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];
      const next = this.source[this.pos + 1];

      // Check for interpolation start
      if (char === "{" && next === "{") {
        // Return text before interpolation first
        if (this.pos > startPos) {
          const text = this.source.slice(startPos, this.pos);
          return this.createToken(TokenType.TEXT, text, startPos);
        }

        // Parse interpolation
        return this.parseInterpolation();
      }

      // Check for tag start
      if (char === "<") {
        // Return text before tag first
        if (this.pos > startPos) {
          const text = this.source.slice(startPos, this.pos);
          return this.createToken(TokenType.TEXT, text, startPos);
        }

        // Check if it's an end tag
        const nextChar = this.source[this.pos + 1];
        if (nextChar === "/") {
          // End tag: </
          this.advance(); // <
          this.advance(); // /
          this.state = State.END_TAG_NAME;
          return this.createToken(TokenType.TAG_END_OPEN, "</");
        }

        // Move to tag parsing
        this.state = State.TAG_OPEN;
        this.advance();
        return this.createToken(TokenType.TAG_OPEN, "<");
      }

      this.advance();
    }

    // End of input - return remaining text
    if (this.pos > startPos) {
      const text = this.source.slice(startPos, this.pos);
      return this.createToken(TokenType.TEXT, text, startPos);
    }

    return null;
  }

  /**
   * Parse interpolation {{ expression }}
   */
  private parseInterpolation(): Token {
    const startPos = this.pos;

    // Skip {{
    this.advance();
    this.advance();

    let depth = 1;
    let value = "";

    while (this.pos < this.source.length && depth > 0) {
      const char = this.source[this.pos];
      const next = this.source[this.pos + 1];

      if (char === "{" && next === "{") {
        depth++;
        value += "{{";
        this.advance();
        this.advance();
      } else if (char === "}" && next === "}") {
        depth--;
        if (depth > 0) {
          value += "}}";
        }
        this.advance();
        this.advance();
      } else {
        value += char;
        this.advance();
      }
    }

    return this.createToken(TokenType.INTERPOLATION, value.trim(), startPos);
  }

  /**
   * Parse after seeing <
   */
  private parseTagOpen(): Token | null {
    const char = this.source[this.pos];

    // Check for comment
    if (char === "!" && this.source.slice(this.pos, this.pos + 3) === "!--") {
      this.advance(); // !
      this.advance(); // -
      this.advance(); // -
      this.state = State.COMMENT;
      return null;
    }

    // Check for end tag
    if (char === "/") {
      this.advance();
      this.state = State.END_TAG_OPEN;
      return this.createToken(TokenType.TAG_END_OPEN, "</");
    }

    // Start of tag name
    this.state = State.TAG_NAME;
    return null;
  }

  /**
   * Parse tag name
   */
  private parseTagName(): Token {
    const startPos = this.pos;
    let name = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.state = State.BEFORE_ATTR_NAME;
        break;
      }

      if (char === ">") {
        // Don't consume - need to emit TAG_CLOSE after tag name
        this.state = State.TAG_CLOSE_PENDING;
        break;
      }

      if (char === "/") {
        this.state = State.SELF_CLOSING_TAG;
        break;
      }

      name += char;
      this.advance();
    }

    return this.createToken(TokenType.TAG_NAME, name, startPos);
  }

  /**
   * Parse > after tag name (when no attributes)
   */
  private parseTagClosePending(): Token {
    this.state = State.DATA;
    this.advance(); // consume >
    return this.createToken(TokenType.TAG_CLOSE, ">");
  }

  /**
   * Parse whitespace before attribute name
   */
  private parseBeforeAttrName(): Token | null {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      if (char === ">") {
        this.state = State.DATA;
        this.advance();
        return this.createToken(TokenType.TAG_CLOSE, ">");
      }

      if (char === "/") {
        this.state = State.SELF_CLOSING_TAG;
        this.advance();
        return null;
      }

      // Start of attribute name
      this.state = State.ATTR_NAME;
      return null;
    }

    return null;
  }

  /**
   * Parse attribute name (including special syntax like [prop], (event), *directive)
   */
  private parseAttrName(): Token {
    const startPos = this.pos;
    let name = "";
    let inBracket = 0;
    let inParen = 0;

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      // Track brackets and parens for special attribute syntax
      if (char === "[") inBracket++;
      if (char === "]") inBracket--;
      if (char === "(") inParen++;
      if (char === ")") inParen--;

      // End of attribute name (only when not in brackets/parens)
      if (inBracket === 0 && inParen === 0) {
        if (this.isWhitespace(char)) {
          this.state = State.AFTER_ATTR_NAME;
          break;
        }

        if (char === "=") {
          // Stay in a state that will emit ATTR_EQUALS
          this.state = State.ATTR_EQUALS_PENDING;
          break;
        }

        if (char === ">") {
          this.state = State.TAG_CLOSE_PENDING_FROM_ATTR;
          break;
        }

        if (char === "/") {
          this.state = State.SELF_CLOSING_TAG;
          break;
        }
      }

      name += char;
      this.advance();
    }

    this.currentAttrName = name;
    return this.createToken(TokenType.ATTR_NAME, name, startPos);
  }

  /**
   * Emit ATTR_EQUALS token
   */
  private parseAttrEqualsPending(): Token {
    this.state = State.BEFORE_ATTR_VALUE;
    this.advance(); // consume =
    return this.createToken(TokenType.ATTR_EQUALS, "=");
  }

  /**
   * Emit TAG_CLOSE after attribute (when > follows directly after attr name)
   */
  private parseTagClosePendingFromAttr(): Token {
    this.state = State.DATA;
    this.advance(); // consume >
    return this.createToken(TokenType.TAG_CLOSE, ">");
  }

  /**
   * Parse whitespace after attribute name
   */
  private parseAfterAttrName(): Token | null {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      if (char === "=") {
        this.state = State.BEFORE_ATTR_VALUE;
        this.advance();
        return this.createToken(TokenType.ATTR_EQUALS, "=");
      }

      if (char === ">") {
        // Boolean attribute with no value
        this.state = State.DATA;
        this.advance();
        return this.createToken(TokenType.TAG_CLOSE, ">");
      }

      if (char === "/") {
        // Boolean attribute before self-closing
        this.state = State.SELF_CLOSING_TAG;
        this.advance();
        return null;
      }

      // Next attribute (boolean attribute with no value)
      this.state = State.ATTR_NAME;
      return null;
    }

    return null;
  }

  /**
   * Parse before attribute value
   */
  private parseBeforeAttrValue(): Token | null {
    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      if (char === '"' || char === "'") {
        this.quoteChar = char;
        this.state = State.ATTR_VALUE_QUOTED;
        this.advance();
        return null;
      }

      // Unquoted value
      this.state = State.ATTR_VALUE_UNQUOTED;
      return null;
    }

    return null;
  }

  /**
   * Parse quoted attribute value
   */
  private parseAttrValueQuoted(): Token {
    const startPos = this.pos;
    let value = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === this.quoteChar) {
        this.state = State.BEFORE_ATTR_NAME;
        this.advance();
        break;
      }

      value += char;
      this.advance();
    }

    return this.createToken(TokenType.ATTR_VALUE, value, startPos);
  }

  /**
   * Parse unquoted attribute value
   */
  private parseAttrValueUnquoted(): Token {
    const startPos = this.pos;
    let value = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.state = State.BEFORE_ATTR_NAME;
        break;
      }

      if (char === ">") {
        this.state = State.DATA;
        break;
      }

      if (char === "/") {
        this.state = State.SELF_CLOSING_TAG;
        break;
      }

      value += char;
      this.advance();
    }

    return this.createToken(TokenType.ATTR_VALUE, value, startPos);
  }

  /**
   * Parse self-closing tag
   */
  private parseSelfClosingTag(): Token | null {
    const char = this.source[this.pos];

    if (char === ">") {
      this.state = State.DATA;
      this.advance();
      return this.createToken(TokenType.TAG_SELF_CLOSE, "/>");
    }

    // Not actually self-closing, treat / as part of attribute
    this.state = State.BEFORE_ATTR_NAME;
    return null;
  }

  /**
   * Parse after </ for end tag
   */
  private parseEndTagOpen(): Token | null {
    this.state = State.END_TAG_NAME;
    return null;
  }

  /**
   * Parse end tag name
   */
  private parseEndTagName(): Token {
    const startPos = this.pos;
    let name = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (this.isWhitespace(char)) {
        this.advance();
        continue;
      }

      if (char === ">") {
        // Don't consume > here - we need to emit TAG_NAME first, then TAG_CLOSE
        this.state = State.END_TAG_CLOSE;
        return this.createToken(TokenType.TAG_NAME, name, startPos);
      }

      name += char;
      this.advance();
    }

    return this.createToken(TokenType.TAG_NAME, name, startPos);
  }

  /**
   * Parse > after end tag name
   */
  private parseEndTagClose(): Token {
    this.state = State.DATA;
    this.advance(); // consume >
    return this.createToken(TokenType.TAG_CLOSE, ">");
  }

  /**
   * Parse inside comment
   */
  private parseComment(): Token | null {
    const startPos = this.pos;
    let value = "";

    while (this.pos < this.source.length) {
      const char = this.source[this.pos];

      if (char === "-") {
        const next = this.source[this.pos + 1];
        const nextNext = this.source[this.pos + 2];

        if (next === "-" && nextNext === ">") {
          // End of comment
          this.advance(); // -
          this.advance(); // -
          this.advance(); // >
          this.state = State.DATA;
          return this.createToken(TokenType.COMMENT, value.trim(), startPos);
        }
      }

      value += char;
      this.advance();
    }

    // Unclosed comment
    return this.createToken(TokenType.COMMENT, value.trim(), startPos);
  }

  /**
   * Parse possible end of comment (saw -)
   */
  private parseCommentEnd(): Token | null {
    // This state is now handled inline in parseComment
    this.state = State.COMMENT;
    return null;
  }

  /**
   * Parse possible end of comment (saw --)
   */
  private parseCommentEndBang(): Token | null {
    // This state is now handled inline in parseComment
    this.state = State.COMMENT;
    return null;
  }

  /**
   * Create a token with location information
   */
  private createToken(type: TokenType, value: string, startPos?: number): Token {
    const start = startPos ?? this.tokenStart;
    const location: SourceLocation = {
      line: this.tokenStartLine,
      column: this.tokenStartColumn,
      start,
      end: this.pos,
    };

    return { type, value, location };
  }

  /**
   * Advance the position by one character
   */
  private advance(): void {
    if (this.pos < this.source.length) {
      if (this.source[this.pos] === "\n") {
        this.line++;
        this.column = 1;
      } else {
        this.column++;
      }
      this.pos++;
    }
  }

  /**
   * Check if a character is whitespace
   */
  private isWhitespace(char: string): boolean {
    return char === " " || char === "\t" || char === "\n" || char === "\r";
  }
}

/**
 * Tokenize an HTML string
 */
export function tokenize(source: string): Token[] {
  const tokenizer = new Tokenizer(source);
  return tokenizer.tokenize();
}
