/**
 * HTML template parser with support for Angular-like directives and bindings
 */

/**
 * Structural directive info (*if, *for, *else)
 */
export interface DirectiveInfo {
  /** *if condition expression */
  if?: string;
  /** *else component name */
  else?: string;
  /** *for loop expression */
  for?: string;
  /** Custom directive name -> expression */
  custom?: Record<string, string>;
}

/**
 * Binding info for [prop], [class.x], [style.x], [attr.x], [(prop)]
 */
export interface BindingInfo {
  /** Property bindings: [prop]="expr" */
  properties?: Record<string, string>;
  /** Class bindings: [class.name]="cond" */
  classes?: Record<string, string>;
  /** Style bindings: [style.prop]="value" */
  styles?: Record<string, string>;
  /** Attribute bindings: [attr.name]="value" */
  attrs?: Record<string, string>;
  /** Two-way bindings: [(prop)]="value" */
  twoWay?: Record<string, string>;
}

export interface HtmlElement {
  type: "element" | "text";
  tagName?: string;
  selfClosing?: boolean;
  attributes?: Record<string, string>;
  /** Structural directives (*if, *for, etc.) */
  directives?: DirectiveInfo;
  /** Property/class/style/attr bindings */
  bindings?: BindingInfo;
  content?: string;
  children?: HtmlElement[];
}

/**
 * Simple HTML tokenizer for Sprig templates
 * Handles self-closing tags and basic HTML structure
 */
export function parseHtml(html: string): HtmlElement[] {
  const elements: HtmlElement[] = [];
  // Only trim leading whitespace, preserve trailing for inline text
  let remaining = html.replace(/^\s+/, "");

  while (remaining.length > 0) {
    // Skip HTML comments: <!-- ... -->
    const commentMatch = remaining.match(/^<!--[\s\S]*?-->/);
    if (commentMatch) {
      remaining = remaining.slice(commentMatch[0].length);
      continue;
    }

    // Check for self-closing or opening tag
    // Use findTagEndIndex to properly handle > inside quoted attributes
    if (remaining.startsWith("<") && !remaining.startsWith("</")) {
      const tagEndIdx = findTagEndIndex(remaining);
      if (tagEndIdx === -1) {
        // Malformed tag, skip the < and continue
        remaining = remaining.slice(1);
        continue;
      }

      const tagContent = remaining.slice(1, tagEndIdx);
      const isSelfClosing = tagContent.trimEnd().endsWith("/");
      const cleanContent = isSelfClosing ? tagContent.trimEnd().slice(0, -1) : tagContent;

      const spaceIdx = cleanContent.search(/\s/);
      const tagName = spaceIdx === -1 ? cleanContent.trim() : cleanContent.slice(0, spaceIdx);
      const attrString = spaceIdx === -1 ? "" : cleanContent.slice(spaceIdx + 1).trim();

      if (isSelfClosing) {
        elements.push({
          type: "element",
          tagName,
          selfClosing: true,
          attributes: parseAttributes(attrString),
          children: [],
        });
        remaining = remaining.slice(tagEndIdx + 1);
        continue;
      }

      // Opening tag - find matching closing tag
      remaining = remaining.slice(tagEndIdx + 1);

      // Find closing tag and parse content between
      const closingTag = `</${tagName}>`;
      const closingIndex = findMatchingClosingTag(remaining, tagName);

      if (closingIndex !== -1) {
        const innerContent = remaining.slice(0, closingIndex);
        remaining = remaining.slice(closingIndex + closingTag.length);

        elements.push({
          type: "element",
          tagName,
          selfClosing: false,
          attributes: parseAttributes(attrString),
          children: parseHtml(innerContent),
        });
      } else {
        // No closing tag found, treat as self-closing
        elements.push({
          type: "element",
          tagName,
          selfClosing: true,
          attributes: parseAttributes(attrString),
          children: [],
        });
      }
      continue;
    }

    // Check for text content (up to next tag or end)
    const textMatch = remaining.match(/^([^<]+)/);
    if (textMatch) {
      const rawText = textMatch[1];
      const isWhitespaceOnly = rawText.trim().length === 0;

      if (!isWhitespaceOnly) {
        // Has actual content - normalize whitespace and filter comment-like text
        const normalizedText = rawText.replace(/\s+/g, " ");
        const cleanText = normalizedText.split("--")[0];
        const finalText = cleanText.replace(/^\s+/, "");
        if (finalText.length > 0) {
          elements.push({
            type: "text",
            content: finalText,
          });
        }
      } else if (elements.length > 0) {
        // Whitespace-only: check if it's inline space or formatting
        // Whitespace with newlines is formatting/indentation - ignore
        // Whitespace without newlines (inline space) - preserve
        if (!rawText.includes("\n")) {
          elements.push({
            type: "text",
            content: " ",
          });
        }
      }

      remaining = remaining.slice(rawText.length);
      continue;
    }

    // Skip anything we can't parse
    remaining = remaining.slice(1);
  }

  return elements;
}

/**
 * Find matching closing tag, accounting for nested same-name tags
 */
function findMatchingClosingTag(html: string, tagName: string): number {
  const openPattern = new RegExp(`<${tagName}[\\s>]`, "g");
  const closePattern = new RegExp(`</${tagName}>`, "g");

  let depth = 1;
  let pos = 0;

  while (depth > 0 && pos < html.length) {
    const nextOpen = html.slice(pos).search(openPattern);
    const nextClose = html.slice(pos).search(closePattern);

    if (nextClose === -1) {
      return -1; // No closing tag found
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos += nextOpen + 1;
    } else {
      depth--;
      if (depth === 0) {
        return pos + nextClose;
      }
      pos += nextClose + 1;
    }
  }

  return -1;
}

/**
 * Find the index of the closing > for a tag, properly handling > inside quoted strings
 * Returns the index of > in the input string, or -1 if not found
 *
 * @example findTagEndIndex('<div *if="a > b" class="x">') => 26
 * @example findTagEndIndex('<input type="text" />') => 20
 */
function findTagEndIndex(html: string): number {
  if (!html.startsWith("<")) return -1;

  let inQuote: string | null = null;
  for (let i = 1; i < html.length; i++) {
    const char = html[i];
    const prevChar = html[i - 1];

    // Track quote state
    if ((char === '"' || char === "'") && prevChar !== "\\") {
      if (inQuote === char) {
        inQuote = null;
      } else if (!inQuote) {
        inQuote = char;
      }
      continue;
    }

    // Only match > when not inside quotes
    if (!inQuote && char === ">") {
      return i;
    }
  }

  return -1;
}

/**
 * Result of parsing attributes including directives and bindings
 */
interface ParsedAttributes {
  attributes: Record<string, string>;
  directives?: DirectiveInfo;
  bindings?: BindingInfo;
}

/**
 * Parse HTML attributes string into key-value pairs
 * Handles:
 * - Standard attributes: attr="value"
 * - Event bindings: (click)="handler()"
 * - Structural directives: *if="cond", *for="let x of y", *else="Component"
 * - Property bindings: [prop]="expr"
 * - Class bindings: [class.name]="cond"
 * - Style bindings: [style.prop]="value"
 * - Attribute bindings: [attr.name]="value"
 * - Two-way bindings: [(prop)]="value"
 */
function parseAttributes(attrString: string): Record<string, string> {
  const result = parseAttributesFull(attrString);
  // For backward compatibility, merge directives and bindings into attributes
  // The HtmlElement will store them separately when constructed
  const attrs = { ...result.attributes };

  // Store directive info in special keys (use !== undefined to preserve empty strings)
  if (result.directives) {
    if (result.directives.if !== undefined) attrs["*if"] = result.directives.if;
    if (result.directives.else !== undefined) attrs["*else"] = result.directives.else;
    if (result.directives.for !== undefined) attrs["*for"] = result.directives.for;
    // Preserve custom directives
    if (result.directives.custom) {
      for (const [name, value] of Object.entries(result.directives.custom)) {
        attrs[`*${name}`] = value;
      }
    }
  }

  // Store binding info in special keys (iterate all entries, including empty strings)
  if (result.bindings) {
    for (const [key, value] of Object.entries(result.bindings.properties ?? {})) {
      attrs[`[${key}]`] = value;
    }
    for (const [key, value] of Object.entries(result.bindings.classes ?? {})) {
      attrs[`[class.${key}]`] = value;
    }
    for (const [key, value] of Object.entries(result.bindings.styles ?? {})) {
      attrs[`[style.${key}]`] = value;
    }
    for (const [key, value] of Object.entries(result.bindings.attrs ?? {})) {
      attrs[`[attr.${key}]`] = value;
    }
    for (const [key, value] of Object.entries(result.bindings.twoWay ?? {})) {
      attrs[`[(${key})]`] = value;
    }
  }

  return attrs;
}

/**
 * Full attribute parser that returns structured directive and binding info
 */
export function parseAttributesFull(attrString: string): ParsedAttributes {
  const attrs: Record<string, string> = {};
  const directives: DirectiveInfo = {};
  const bindings: BindingInfo = {};

  // Patterns now properly handle nested quotes:
  // - "..." allows ' inside
  // - '...' allows " inside

  // Structural directives: *if="cond", *for="expr", *else="Component", *custom="expr"
  const directivePattern = /\*([a-zA-Z][a-zA-Z0-9]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  // Template refs: #refName (boolean-style, no value)
  // Must be standalone attribute, not inside a quoted value like href="#anchor"
  // Match #refName only when preceded by whitespace or start of string
  const templateRefPattern = /(?:^|\s)#([a-zA-Z][a-zA-Z0-9]*)/g;

  // Two-way bindings: [(prop)]="value"
  const twoWayPattern = /\[\(([a-zA-Z][a-zA-Z0-9]*)\)\]\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  // Property/class/style/attr bindings: [prop]="expr", [class.x]="cond", [style.x]="val", [style.x.%]="val", [attr.x]="val"
  // The pattern includes % for style units like [style.width.%]
  const bindingPattern = /\[([a-zA-Z][a-zA-Z0-9.%-]*)\]\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  // Event binding attributes: (event)="handler()"
  const eventPattern = /\(([a-zA-Z]+)\)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  // Standard attributes: attr="value" or attr='value'
  const standardPattern = /([a-zA-Z][a-zA-Z0-9-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let match;

  // Helper to get value from match with alternation (double or single quotes)
  const getValue = (m: RegExpExecArray, valueIndex: number): string => {
    return m[valueIndex] ?? m[valueIndex + 1] ?? "";
  };

  // Parse template refs: #refName
  while ((match = templateRefPattern.exec(attrString)) !== null) {
    const refName = match[1];
    // Store with # prefix so transformer can recognize it
    attrs[`#${refName}`] = "";
  }

  // Parse structural directives
  while ((match = directivePattern.exec(attrString)) !== null) {
    const name = match[1];
    const value = getValue(match, 2);
    if (name === "if") {
      directives.if = value;
    } else if (name === "else") {
      directives.else = value;
    } else if (name === "for") {
      directives.for = value;
    } else {
      // Custom directive
      if (!directives.custom) directives.custom = {};
      directives.custom[name] = value;
    }
  }

  // Parse two-way bindings
  while ((match = twoWayPattern.exec(attrString)) !== null) {
    if (!bindings.twoWay) bindings.twoWay = {};
    bindings.twoWay[match[1]] = getValue(match, 2);
  }

  // Parse property/class/style/attr bindings
  while ((match = bindingPattern.exec(attrString)) !== null) {
    const key = match[1];
    const value = getValue(match, 2);

    if (key.startsWith("class.")) {
      if (!bindings.classes) bindings.classes = {};
      bindings.classes[key.slice(6)] = value;
    } else if (key.startsWith("style.")) {
      if (!bindings.styles) bindings.styles = {};
      bindings.styles[key.slice(6)] = value;
    } else if (key.startsWith("attr.")) {
      if (!bindings.attrs) bindings.attrs = {};
      bindings.attrs[key.slice(5)] = value;
    } else {
      if (!bindings.properties) bindings.properties = {};
      bindings.properties[key] = value;
    }
  }

  // Parse event bindings
  while ((match = eventPattern.exec(attrString)) !== null) {
    const key = `(${match[1]})`;
    attrs[key] = getValue(match, 2);
  }

  // Parse standard attributes (but not ones that look like bindings/directives)
  // Need to reset lastIndex since we're reusing patterns
  standardPattern.lastIndex = 0;
  while ((match = standardPattern.exec(attrString)) !== null) {
    const key = match[1];
    const matchIndex = match.index;

    // Skip if this is part of a directive (*if, *for, *else)
    // Check if there's a * immediately before this match
    const charBefore = matchIndex > 0 ? attrString[matchIndex - 1] : "";
    if (charBefore === "*") {
      continue;
    }

    // Skip if it's inside [] (binding)
    if (attrString.includes(`[${key}]`)) {
      continue;
    }

    attrs[key] = getValue(match, 2);
  }

  // Handle boolean attributes (no value)
  // First, remove all patterns we've already matched to avoid false positives
  let cleaned = attrString
    .replace(templateRefPattern, "")
    .replace(directivePattern, "")
    .replace(twoWayPattern, "")
    .replace(bindingPattern, "")
    .replace(eventPattern, "")
    .replace(standardPattern, "");

  const boolPattern = /\b([a-zA-Z][a-zA-Z0-9-]*)(?=\s|$)/g;
  while ((match = boolPattern.exec(cleaned)) !== null) {
    if (match[1] && !attrs[match[1]]) {
      attrs[match[1]] = "true";
    }
  }

  const result: ParsedAttributes = { attributes: attrs };
  if (Object.keys(directives).length > 0) {
    result.directives = directives;
  }
  if (Object.keys(bindings).length > 0) {
    result.bindings = bindings;
  }

  return result;
}
