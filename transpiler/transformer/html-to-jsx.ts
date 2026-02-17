/**
 * HTML to JSX transformer with support for Angular-like directives and bindings
 */

import { parseHtml, type HtmlElement } from "../parser/html.ts";
import { kebabToPascal } from "../utils/naming.ts";
import { collectCustomTags, resolveTag, isStandardHtmlTag, type TagImport } from "./tags.ts";
import type { SprigComponent } from "../parser/mod.ts";
import { getSafeVarName } from "../parser/mod.ts";
import { transformPipeExpression, transformInterpolationWithPipes } from "./pipes.ts";
import {
  parseForExpression,
  generateKeyExpression,
  transformIfDirective,
  transformForDirective,
} from "./directives.ts";
import {
  WarningCollector,
  WarningCodes,
  isDangerousBinding,
  type TranspilerWarning,
} from "../utils/warnings.ts";
import {
  directiveRegistry,
  transformCustomDirective,
  type RegisteredDirective,
} from "./custom-directives.ts";
import { pipeRegistry, type RegisteredPipe } from "./custom-pipes.ts";
import { analyzeSlots, transformSlot, type SlotContext, type SlotInfo } from "./slot.ts";

export interface JsxResult {
  /** JSX code string */
  jsx: string;
  /** Required imports */
  imports: TagImport[];
  /** Whether the template contains <slot /> (used in layouts) */
  hasSlot: boolean;
  /** @deprecated Use hasSlot instead */
  hasOutlet: boolean;
  /** Slot analysis info */
  slotInfo?: SlotInfo;
  /** Required pipe helper functions */
  pipeHelpers?: string[];
  /** Warnings generated during transformation */
  warnings?: TranspilerWarning[];
  /** Custom pipes used in the template */
  usedPipes?: RegisteredPipe[];
  /** Custom directives used in the template */
  usedDirectives?: RegisteredDirective[];
  /** Template refs collected from #refName syntax */
  templateRefs?: string[];
}

/**
 * Context for tracking used custom pipes and directives during transformation
 */
interface TransformContext {
  customPipes?: Record<string, string>;
  warnings: WarningCollector;
  usedPipes: Set<string>;
  usedDirectives: Set<string>;
  slotContext: SlotContext;
  /** Collected template refs from #refName syntax */
  templateRefs: Set<string>;
  /** Counter for generating unique loop keys across multiple *for directives */
  loopCounter: number;
}

/**
 * Transform reserved word identifiers in expressions to their safe counterparts
 * e.g., "class" -> "className", "class + ' extra'" -> "className + ' extra'"
 */
function transformReservedWords(expr: string): string {
  // Match word boundaries to replace identifiers but not property access
  // This handles "class" but not "obj.class" (which is valid JS)
  return expr.replace(/\b(class)\b(?![\s]*[:\.])/g, (match) => {
    return getSafeVarName(match);
  });
}

/**
 * Transform HTML template to JSX
 *
 * @param html - HTML template string
 * @param allComponents - All known components for tag resolution
 * @param customPipes - Custom pipe name -> function mapping
 * @param slotContext - Context for slot handling: "layout" or "component"
 */
export function htmlToJsx(
  html: string,
  allComponents: SprigComponent[],
  customPipes?: Record<string, string>,
  slotContext: SlotContext = "component",
): JsxResult {
  // Create transform context
  const context: TransformContext = {
    customPipes,
    warnings: new WarningCollector(),
    usedPipes: new Set(),
    usedDirectives: new Set(),
    slotContext,
    templateRefs: new Set(),
    loopCounter: 0,
  };

  // Analyze slots in template
  const slotInfo = analyzeSlots(html);

  // Collect and resolve custom tags (before transformation)
  const customTags = collectCustomTags(html);
  const imports: TagImport[] = [];

  for (const tag of customTags) {
    const tagImport = resolveTag(tag, allComponents);
    if (tagImport) {
      imports.push(tagImport);
    }
  }

  // Parse HTML (with original Sprig syntax)
  const elements = parseHtml(html);

  // Check for slot or legacy outlet
  const hasSlot = slotInfo.hasSlot || html.includes("<outlet");
  const hasOutlet = hasSlot; // Deprecated, kept for compatibility

  // Transform to JSX (handles bindings during conversion)
  const jsx = elementsToJsx(elements, allComponents, context);

  const result: JsxResult = { jsx, imports, hasSlot, hasOutlet, slotInfo };

  // Collect used pipes info
  if (context.usedPipes.size > 0) {
    result.usedPipes = [];
    for (const pipeName of context.usedPipes) {
      const pipe = pipeRegistry.get(pipeName);
      if (pipe) {
        result.usedPipes.push(pipe);
      }
    }
  }

  // Collect used directives info
  if (context.usedDirectives.size > 0) {
    result.usedDirectives = [];
    for (const directiveName of context.usedDirectives) {
      const directive = directiveRegistry.get(directiveName);
      if (directive) {
        result.usedDirectives.push(directive);
      }
    }
  }

  // Include warnings if any were generated
  if (context.warnings.hasWarnings()) {
    result.warnings = context.warnings.getWarnings();
  }

  // Include template refs if any were found
  if (context.templateRefs.size > 0) {
    result.templateRefs = Array.from(context.templateRefs);
  }

  return result;
}

function elementsToJsx(
  elements: HtmlElement[],
  allComponents: SprigComponent[],
  context: TransformContext,
): string {
  if (elements.length === 0) {
    return "";
  }

  const jsxParts = elements.map((el) => elementToJsx(el, allComponents, context));

  // If multiple top-level elements, wrap in fragment
  if (jsxParts.length > 1) {
    return `<>\n      ${jsxParts.join("\n      ")}\n    </>`;
  }

  return jsxParts[0];
}

function elementToJsx(
  element: HtmlElement,
  allComponents: SprigComponent[],
  context: TransformContext,
): string {
  if (element.type === "text") {
    const content = element.content || "";

    // Whitespace-only text handling:
    // - Whitespace with newlines is formatting/indentation - ignore it
    // - Whitespace without newlines (inline spaces) should be preserved
    if (content.trim() === "" && content.length > 0) {
      // If it contains newlines, it's formatting whitespace - ignore
      if (content.includes("\n")) {
        return "";
      }
      // Pure inline space - preserve it
      return `{" "}`;
    }

    // Transform interpolation in text with pipe support: {{var | pipe}} -> {transformed}
    // Track used pipes
    trackPipesInText(content, context);
    return transformInterpolationWithPipes(content, context.customPipes);
  }

  const tagName = element.tagName || "div";

  // Handle <outlet /> -> <Component /> (legacy support)
  if (tagName === "outlet") {
    return "<Component />";
  }

  // Handle <slot /> based on context
  if (tagName === "slot") {
    const attrs = element.attributes || {};
    const attrString = Object.entries(attrs)
      .map(([k, v]) => `${k}="${v}"`)
      .join(" ");
    return transformSlot(attrString, context.slotContext);
  }

  // Handle <ng-content /> (Angular slot equivalent)
  if (tagName === "ng-content") {
    const attrs = element.attributes || {};
    const selectAttr = attrs.select;

    // <ng-content select=".header"> -> {header}
    // <ng-content> -> {children}
    if (selectAttr) {
      let slotName = selectAttr;
      // Convert CSS selector to slot name
      if (slotName.startsWith(".")) {
        slotName = slotName.slice(1);
      } else if (slotName.includes("[slot=")) {
        const slotAttrMatch = slotName.match(/\[slot=["']?([^"'\]]+)/);
        if (slotAttrMatch) {
          slotName = slotAttrMatch[1];
        }
      }
      return `{${slotName}}`;
    }

    return "{children}";
  }

  // Convert custom tags to PascalCase
  const jsxTagName = isCustomTag(tagName) ? kebabToPascal(tagName) : tagName;

  // Extract directives and bindings from attributes
  const attrs = element.attributes || {};
  const {
    ifCondition,
    elseComponent,
    forExpression,
    customDirectives,
    remainingAttrs,
    templateRef,
  } = extractDirectivesAndBindings(attrs, context.warnings, context);

  // Track used custom directives
  for (const { name } of customDirectives) {
    context.usedDirectives.add(name);
  }

  // Build attributes string (with binding transformation)
  const attrsStr = buildAttributesString(remainingAttrs, tagName, customDirectives, context, templateRef);

  // Build element JSX (without directives)
  let elementJsx: string;

  // Handle children
  if (element.selfClosing || !element.children?.length) {
    elementJsx = `<${jsxTagName}${attrsStr} />`;
  } else {
    const childrenJsx = element.children
      .map((child) => elementToJsx(child, allComponents, context))
      .join("");
    elementJsx = `<${jsxTagName}${attrsStr}>${childrenJsx}</${jsxTagName}>`;
  }

  // Apply *for directive (wraps with map)
  // Use !== undefined to handle empty strings (which trigger warnings)
  if (forExpression !== undefined) {
    const forInfo = parseForExpression(forExpression, context.warnings);
    if (forInfo) {
      // Increment loop counter for unique key generation
      context.loopCounter++;
      // Generate key expression
      let keyExpr = generateKeyExpression(forInfo);
      // If using item variable as key and there are multiple loops, prefix for uniqueness
      if (keyExpr === forInfo.itemVar && context.loopCounter > 1) {
        keyExpr = `"${context.loopCounter}_" + ${keyExpr}`;
      }
      elementJsx = addKeyToElement(elementJsx, keyExpr);
      elementJsx = transformForDirective(elementJsx, forInfo);
    }
  }

  // Apply *if directive (wraps with conditional)
  // Use !== undefined to handle empty strings (which trigger warnings)
  if (ifCondition !== undefined) {
    // Only apply transformation if condition is non-empty
    if (ifCondition.trim()) {
      elementJsx = transformIfDirective(elementJsx, ifCondition, elseComponent);
    }
  }

  return elementJsx;
}

/**
 * Add key attribute to a JSX element string
 */
function addKeyToElement(elementJsx: string, keyExpr: string): string {
  // Find the opening tag's closing > and insert key before it
  // Must handle JSX expressions like onClick={() => ...} which contain > inside braces

  // Find the end of the opening tag by tracking brace depth
  // The opening tag ends at the first > that's not inside {} braces
  let braceDepth = 0;
  let inString: string | null = null;
  let openingTagEndIdx = -1;
  let isSelfClosing = false;

  for (let i = 0; i < elementJsx.length; i++) {
    const char = elementJsx[i];
    const prevChar = i > 0 ? elementJsx[i - 1] : "";

    // Track string literals (skip content inside strings)
    if (inString) {
      if (char === inString && prevChar !== "\\") {
        inString = null;
      }
      continue;
    }

    // Enter string
    if ((char === '"' || char === "'" || char === "`") && braceDepth > 0) {
      inString = char;
      continue;
    }

    // Track braces
    if (char === "{") {
      braceDepth++;
      continue;
    }
    if (char === "}") {
      braceDepth--;
      continue;
    }

    // Only look for > when not inside braces
    if (braceDepth === 0 && char === ">") {
      isSelfClosing = prevChar === "/";
      openingTagEndIdx = i;
      break;
    }
  }

  if (openingTagEndIdx === -1) {
    return elementJsx;
  }

  // Insert key before the > (or />)
  const insertIdx = isSelfClosing ? openingTagEndIdx - 1 : openingTagEndIdx;
  const before = elementJsx.slice(0, insertIdx);
  const after = elementJsx.slice(insertIdx);

  return `${before} key={${keyExpr}}${after}`;
}

/**
 * Custom directive usage info
 */
interface CustomDirectiveUsage {
  name: string;
  expression: string;
  directive: RegisteredDirective;
}

/**
 * Extract directives and bindings from attributes, returning remaining standard attributes
 */
function extractDirectivesAndBindings(
  attrs: Record<string, string>,
  warnings?: WarningCollector,
  context?: TransformContext,
): {
  ifCondition?: string;
  elseComponent?: string;
  forExpression?: string;
  customDirectives: CustomDirectiveUsage[];
  remainingAttrs: Record<string, string>;
  templateRef?: string;
} {
  const remainingAttrs: Record<string, string> = {};
  const customDirectives: CustomDirectiveUsage[] = [];
  let ifCondition: string | undefined;
  let elseComponent: string | undefined;
  let forExpression: string | undefined;
  let templateRef: string | undefined;

  for (const [key, value] of Object.entries(attrs)) {
    if (key === "*if") {
      ifCondition = value;
    } else if (key === "*else") {
      elseComponent = value;
    } else if (key === "*for") {
      forExpression = value;
    } else if (key.startsWith("#")) {
      // Template ref: #refName
      templateRef = key.slice(1);
      if (context) {
        context.templateRefs.add(templateRef);
      }
    } else if (key.startsWith("*")) {
      // Check for custom directive
      const directiveName = key.slice(1);
      const directive = directiveRegistry.get(directiveName);
      if (directive) {
        customDirectives.push({
          name: directiveName,
          expression: value,
          directive,
        });
      } else {
        // Unknown directive, pass through as attribute
        remainingAttrs[key] = value;
      }
    } else {
      remainingAttrs[key] = value;
    }
  }

  // Warn for empty *if condition
  if (ifCondition !== undefined && !ifCondition.trim()) {
    warnings?.warn(
      WarningCodes.EMPTY_IF_CONDITION,
      `*if directive has empty condition. Usage: *if="someCondition"`
    );
  }

  // Warn for orphan *else without *if
  if (elseComponent !== undefined && ifCondition === undefined) {
    warnings?.warn(
      WarningCodes.ORPHAN_ELSE,
      `*else directive found without *if. *else must be used together with *if on the same element`
    );
  }

  return { ifCondition, elseComponent, forExpression, customDirectives, remainingAttrs, templateRef };
}

/**
 * Track pipe usages in text content
 */
function trackPipesInText(text: string, context: TransformContext): void {
  // Match interpolations: {{expression | pipe}}
  const interpolations = text.match(/\{\{([^}]+)\}\}/g);
  if (!interpolations) return;

  for (const interp of interpolations) {
    const expr = interp.slice(2, -2); // Remove {{ and }}
    trackPipesInExpression(expr, context);
  }
}

/**
 * Track pipe usages in an expression
 */
function trackPipesInExpression(expr: string, context: TransformContext): void {
  // Simple pipe detection - split by | and check each segment
  const parts = expr.split("|");
  for (let i = 1; i < parts.length; i++) {
    const pipePart = parts[i].trim();
    const pipeName = pipePart.split(":")[0].trim();
    if (pipeName && pipeRegistry.has(pipeName)) {
      context.usedPipes.add(pipeName);
    }
  }
}

/**
 * Build JSX attribute string with support for all binding types
 */
function buildAttributesString(
  attrs: Record<string, string>,
  tagName: string,
  customDirectives: CustomDirectiveUsage[],
  context: TransformContext,
  templateRef?: string,
): string {
  const parts: string[] = [];

  // Add template ref if present: #refName -> ref={refName}
  // Use 'as any' since we don't know the specific element type at parse time
  if (templateRef) {
    parts.push(`ref={${templateRef} as any}`);
  }

  // Add custom directive spreads first
  if (customDirectives.length > 0) {
    for (const { directive, expression } of customDirectives) {
      parts.push(`{...${directive.transformFn}({}, ${expression})}`);
    }
  }

  // Collect class bindings to merge
  const classBindings: Array<{ className: string; condition: string }> = [];
  let staticClass: string | undefined;
  let dynamicClass: string | undefined; // [class]="expr" binding

  // Collect style bindings to merge
  const styleBindings: Record<string, string> = {};
  let staticStyle: string | undefined;

  // Collect two-way bindings
  const twoWayBindings: Record<string, string> = {};

  // First pass: collect special bindings
  for (const [key, value] of Object.entries(attrs)) {
    if (key === "class") {
      staticClass = value;
    } else if (key === "[class]") {
      // Dynamic class binding: [class]="expr"
      // Transform reserved word identifiers (e.g., "class" -> "className")
      dynamicClass = transformReservedWords(value);
    } else if (key === "style") {
      staticStyle = value;
    } else if (key.startsWith("[class.") && key.endsWith("]")) {
      const className = key.slice(7, -1);
      // Warn for empty class binding condition
      if (!value.trim()) {
        context.warnings.warn(
          WarningCodes.EMPTY_BINDING_EXPRESSION,
          `[class.${className}] binding has empty expression`
        );
      }
      classBindings.push({ className, condition: value });
    } else if (key.startsWith("[style.") && key.endsWith("]")) {
      const styleProp = key.slice(7, -1);
      // Warn for empty style binding value
      if (!value.trim()) {
        context.warnings.warn(
          WarningCodes.EMPTY_BINDING_EXPRESSION,
          `[style.${styleProp}] binding has empty expression`
        );
      }
      // Handle style bindings with units: [style.width.px]="value" -> width: `${value}px`
      const { propName, unit } = parseStyleProp(styleProp);
      // Convert kebab-case to camelCase
      const camelProp = kebabToCamel(propName);
      if (unit) {
        // Wrap value with template literal to include unit
        styleBindings[camelProp] = `\`\${${value}}${unit}\``;
      } else {
        styleBindings[camelProp] = value;
      }
    } else if (key.startsWith("[(") && key.endsWith(")]")) {
      const propName = key.slice(2, -2);
      // Warn for empty two-way binding
      if (!value.trim()) {
        context.warnings.warn(
          WarningCodes.INVALID_TWO_WAY_BINDING,
          `[(${propName})] two-way binding has empty expression`
        );
      }
      twoWayBindings[propName] = value;
    }
  }

  // Build className from static class, dynamic class, and class bindings
  const classNameResult = buildClassName(staticClass, classBindings, dynamicClass);
  if (classNameResult) {
    parts.push(classNameResult);
  }

  // Build style object from static style and style bindings
  const styleResult = buildStyleObject(staticStyle, styleBindings);
  if (styleResult) {
    parts.push(styleResult);
  }

  // Build two-way bindings
  for (const [prop, variable] of Object.entries(twoWayBindings)) {
    const { valueProp, eventHandler } = buildTwoWayBinding(prop, variable, tagName);
    parts.push(valueProp);
    parts.push(eventHandler);
  }

  // Second pass: handle remaining attributes
  for (const [key, value] of Object.entries(attrs)) {
    // Skip already-processed bindings
    if (
      key === "class" ||
      key === "[class]" ||
      key === "style" ||
      key.startsWith("[class.") ||
      key.startsWith("[style.") ||
      key.startsWith("[(")
    ) {
      continue;
    }

    // Event binding: (click)="handler()"
    // Handles $event: (change)="handler($event)" -> onChange={(e) => handler(e)}
    if (key.startsWith("(") && key.endsWith(")")) {
      const eventName = key.slice(1, -1);
      const jsxEvent = mapEventName(eventName);

      // Check if handler uses $event (Angular's event object)
      const usesEvent = value.includes("$event");

      // If handler has (), wrap in arrow function
      if (value.includes("(")) {
        if (usesEvent) {
          // Replace $event with e and use (e) => ...
          const transformedValue = value.replace(/\$event/g, "e");
          parts.push(`${jsxEvent}={(e) => ${transformedValue}}`);
        } else {
          parts.push(`${jsxEvent}={() => ${value}}`);
        }
      } else {
        parts.push(`${jsxEvent}={${value}}`);
      }
      continue;
    }

    // Property binding: [prop]="expr"
    if (key.startsWith("[") && key.endsWith("]")) {
      const propName = key.slice(1, -1);

      // Warn for empty binding expression
      if (!value.trim()) {
        context.warnings.warn(
          WarningCodes.EMPTY_BINDING_EXPRESSION,
          `[${propName}] binding has empty expression`
        );
      }

      // Warn for dangerous bindings (XSS risk)
      if (isDangerousBinding(propName)) {
        context.warnings.warn(
          WarningCodes.DANGEROUS_BINDING,
          `[${propName}] is a dangerous binding that can lead to XSS vulnerabilities. Consider using safer alternatives.`
        );
      }

      // Track pipes used in this binding
      trackPipesInExpression(value, context);

      // Transform pipes in the binding value
      let transformedValue = transformPipeExpression(value, context.customPipes);

      // Transform .bind(this, ...) patterns - not needed in functional components
      // .bind(this) -> (no binding)
      // .bind(this, 'arg') -> .bind(null, 'arg') to preserve partial application
      transformedValue = transformedValue.replace(/\.bind\(this\)/g, "");
      transformedValue = transformedValue.replace(/\.bind\(this,\s*/g, ".bind(null, ");

      // Handle [attr.xxx]="value"
      if (propName.startsWith("attr.")) {
        const attrName = propName.slice(5);
        parts.push(`${attrName}={${transformedValue}}`);
        continue;
      }

      // Regular property binding
      const jsxProp = htmlAttrToJsx(propName);
      parts.push(`${jsxProp}={${transformedValue}}`);
      continue;
    }

    // Standard attribute
    const jsxKey = htmlAttrToJsx(key);

    if (value === "true") {
      parts.push(jsxKey);
    } else if (isNumericAttribute(jsxKey) && /^\d+$/.test(value)) {
      // Numeric attributes should use JSX expression syntax {number}
      parts.push(`${jsxKey}={${value}}`);
    } else {
      parts.push(`${jsxKey}="${value}"`);
    }
  }

  return parts.length > 0 ? " " + parts.join(" ") : "";
}

/**
 * Build className expression from static class, dynamic class, and class bindings
 * @param staticClass - Static class="..." value
 * @param bindings - [class.name]="condition" bindings
 * @param dynamicClass - [class]="expr" binding (entire class expression)
 */
function buildClassName(
  staticClass: string | undefined,
  bindings: Array<{ className: string; condition: string }>,
  dynamicClass?: string,
): string | undefined {
  if (!staticClass && !dynamicClass && bindings.length === 0) {
    return undefined;
  }

  // Only dynamic class binding, no static or conditional bindings
  if (dynamicClass && !staticClass && bindings.length === 0) {
    return `className={${dynamicClass}}`;
  }

  // No bindings, just static class
  if (bindings.length === 0 && !dynamicClass && staticClass) {
    return `className="${staticClass}"`;
  }

  // Build parts array for concatenation
  const parts: string[] = [];

  // Add static class first
  if (staticClass) {
    parts.push(`"${staticClass}"`);
  }

  // Add dynamic class expression
  if (dynamicClass) {
    if (parts.length > 0) {
      parts.push(`" " + (${dynamicClass})`);
    } else {
      parts.push(`(${dynamicClass})`);
    }
  }

  // Add conditional class bindings
  for (const { className, condition } of bindings) {
    if (condition === "true") {
      // For literal true, just add the class
      if (parts.length > 0) {
        parts.push(`" ${className}"`);
      } else {
        parts.push(`"${className}"`);
      }
    } else {
      const prefix = parts.length > 0 ? " " : "";
      parts.push(`(${condition} ? "${prefix}${className}" : "")`);
    }
  }

  if (parts.length === 1 && parts[0].startsWith('"') && parts[0].endsWith('"')) {
    return `className=${parts[0]}`;
  }

  return `className={${parts.join(" + ")}}`;
}

/**
 * Build style object from static style and dynamic style bindings
 * @param staticStyle - Static CSS string like "width: 100px; height: 200px"
 * @param bindings - Dynamic style bindings like { opacity: "visible ? 1 : 0" }
 */
function buildStyleObject(
  staticStyle: string | undefined,
  bindings: Record<string, string>,
): string | undefined {
  const props: string[] = [];

  // Parse and add static styles
  if (staticStyle) {
    // Parse CSS string: "width: 100px; height: 200px" -> { width: "100px", height: "200px" }
    const cssProps = staticStyle.split(";").filter(s => s.trim());
    for (const prop of cssProps) {
      const colonIdx = prop.indexOf(":");
      if (colonIdx > 0) {
        const name = prop.slice(0, colonIdx).trim();
        const value = prop.slice(colonIdx + 1).trim();
        // Convert kebab-case to camelCase
        const camelName = kebabToCamel(name);
        // Static values are strings, quoted
        props.push(`${camelName}: "${value}"`);
      }
    }
  }

  // Add dynamic bindings (these override static styles if same property)
  const entries = Object.entries(bindings);
  for (const [prop, value] of entries) {
    // Dynamic values are expressions, not quoted
    props.push(`${prop}: ${value}`);
  }

  if (props.length === 0) {
    return undefined;
  }

  return `style={{${props.join(", ")}}}`;
}

/**
 * Build two-way binding properties
 */
function buildTwoWayBinding(
  prop: string,
  variable: string,
  tagName: string,
): { valueProp: string; eventHandler: string } {
  // For checkbox, use checked and onChange
  if (prop === "checked") {
    return {
      valueProp: `checked={${variable}}`,
      eventHandler: `onChange={(e) => ${variable}.value = e.target.checked}`,
    };
  }

  // For select and other elements with "value", use onChange
  if (tagName === "select") {
    return {
      valueProp: `value={${variable}}`,
      eventHandler: `onChange={(e) => ${variable}.value = e.target.value}`,
    };
  }

  // Default: use onInput for text inputs
  return {
    valueProp: `${prop}={${variable}}`,
    eventHandler: `onInput={(e) => ${variable}.value = e.target.${prop}}`,
  };
}

/**
 * Convert kebab-case to camelCase
 */
function kebabToCamel(str: string): string {
  return str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
}

/**
 * Parse style property name with optional unit suffix
 * Examples:
 *   "width.px" -> { propName: "width", unit: "px" }
 *   "animation-duration.s" -> { propName: "animation-duration", unit: "s" }
 *   "color" -> { propName: "color", unit: undefined }
 */
function parseStyleProp(styleProp: string): { propName: string; unit?: string } {
  // Common CSS units to check for
  const units = ["px", "em", "rem", "%", "vh", "vw", "vmin", "vmax", "s", "ms", "deg", "rad", "turn"];

  for (const unit of units) {
    if (styleProp.endsWith(`.${unit}`)) {
      return {
        propName: styleProp.slice(0, -(unit.length + 1)),
        unit,
      };
    }
  }

  return { propName: styleProp };
}

/**
 * Map event names to React/Preact event handler names
 */
function mapEventName(eventName: string): string {
  const eventMap: Record<string, string> = {
    click: "onClick",
    dblclick: "onDblClick",
    mousedown: "onMouseDown",
    mouseup: "onMouseUp",
    mousemove: "onMouseMove",
    mouseenter: "onMouseEnter",
    mouseleave: "onMouseLeave",
    mouseover: "onMouseOver",
    mouseout: "onMouseOut",
    keydown: "onKeyDown",
    keyup: "onKeyUp",
    keypress: "onKeyPress",
    focus: "onFocus",
    blur: "onBlur",
    input: "onInput",
    change: "onChange",
    submit: "onSubmit",
    scroll: "onScroll",
  };

  return eventMap[eventName.toLowerCase()] || `on${capitalize(eventName)}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function htmlAttrToJsx(attr: string): string {
  const mapping: Record<string, string> = {
    class: "className",
    for: "htmlFor",
    tabindex: "tabIndex",
    readonly: "readOnly",
    maxlength: "maxLength",
    minlength: "minLength",
    colspan: "colSpan",
    rowspan: "rowSpan",
    cellpadding: "cellPadding",
    cellspacing: "cellSpacing",
    usemap: "useMap",
    frameborder: "frameBorder",
    contenteditable: "contentEditable",
    crossorigin: "crossOrigin",
    datetime: "dateTime",
    enctype: "encType",
    formaction: "formAction",
    formenctype: "formEncType",
    formmethod: "formMethod",
    formnovalidate: "formNoValidate",
    formtarget: "formTarget",
    hreflang: "hrefLang",
    inputmode: "inputMode",
    novalidate: "noValidate",
    srcset: "srcSet",
    srclang: "srcLang",
    srcdoc: "srcDoc",
    accesskey: "accessKey",
    autocomplete: "autoComplete",
    autofocus: "autoFocus",
    autoplay: "autoPlay",
  };

  return mapping[attr.toLowerCase()] || attr;
}

// Attributes that should be numeric in JSX (not strings)
const numericAttributes = new Set([
  "colSpan",
  "rowSpan",
  "tabIndex",
  "cols",
  "rows",
  "size",
  "span",
  "start",
  "height",
  "width",
  "maxLength",
  "minLength",
]);

function isNumericAttribute(attr: string): boolean {
  return numericAttributes.has(attr);
}

function isCustomTag(tagName: string): boolean {
  // Custom tags either contain hyphens OR are non-standard HTML tags
  return tagName.includes("-") || !isStandardHtmlTag(tagName);
}
