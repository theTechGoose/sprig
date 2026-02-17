/**
 * Custom tag resolution - converts kebab-case tags to PascalCase imports
 */

import { kebabToPascal } from "../utils/naming.ts";
import type { SprigComponent } from "../parser/mod.ts";
import { parseClass } from "../parser/mod.ts";
import { requiresIsland } from "./bindings.ts";

export interface TagImport {
  /** Component name in PascalCase */
  componentName: string;
  /** Import path (e.g., "@/islands/ExampleComponent.tsx") */
  importPath: string;
  /** Whether this is an island (interactive) component */
  isIsland: boolean;
}

/**
 * Resolve a custom tag name to its import information
 * Supports both kebab-case (status-badge) and PascalCase (PrintButton) tags
 */
export function resolveTag(
  tagName: string,
  allComponents: SprigComponent[],
): TagImport | null {
  // Skip standard HTML tags and special Angular/Sprig elements
  if (isStandardHtmlTag(tagName) || tagName === "slot" || tagName === "outlet" || tagName === "ng-content") {
    return null;
  }

  // If tag is already PascalCase, use it as-is; otherwise convert from kebab-case
  const isPascalCase = /^[A-Z]/.test(tagName);
  const pascalName = isPascalCase ? tagName : kebabToPascal(tagName);

  // Find matching component
  const component = allComponents.find(
    (c) => c.metadata.className === pascalName,
  );

  if (!component) {
    console.warn(`Warning: Could not resolve tag <${tagName}>`);
    return null;
  }

  // Determine if component is an island using same logic as generator
  let isIsland: boolean;
  if (component.metadata.island !== undefined) {
    // Explicit setting takes precedence
    isIsland = component.metadata.island;
  } else {
    // Auto-detect based on interactive features and dependencies
    const needsClientJs = requiresIsland(component.template);
    const parsedClass = parseClass(component.source);
    const hasDependencies = parsedClass ? parsedClass.dependencies.length > 0 : false;
    isIsland = needsClientJs || hasDependencies;
  }

  const folder = isIsland ? "islands" : "components";
  const importPath = `@/${folder}/${pascalName}.tsx`;

  return {
    componentName: pascalName,
    importPath,
    isIsland,
  };
}

/**
 * Collect all custom tags used in an HTML template
 * Supports both kebab-case (status-badge) and PascalCase (PrintButton) tags
 */
export function collectCustomTags(html: string): string[] {
  // Match both lowercase and PascalCase tag names
  const tagPattern = /<([A-Za-z][A-Za-z0-9-]*)/g;
  const tags = new Set<string>();

  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    const tagName = match[1];
    if (!isStandardHtmlTag(tagName) && tagName !== "outlet" && tagName !== "slot" && tagName !== "ng-content") {
      tags.add(tagName);
    }
  }

  return Array.from(tags);
}

const STANDARD_HTML_TAGS = new Set([
  // HTML elements
  "a", "abbr", "address", "area", "article", "aside", "audio",
  "b", "base", "bdi", "bdo", "blockquote", "body", "br", "button",
  "canvas", "caption", "cite", "code", "col", "colgroup",
  "data", "datalist", "dd", "del", "details", "dfn", "dialog", "div", "dl", "dt",
  "em", "embed",
  "fieldset", "figcaption", "figure", "footer", "form",
  "h1", "h2", "h3", "h4", "h5", "h6", "head", "header", "hgroup", "hr", "html",
  "i", "iframe", "img", "input", "ins",
  "kbd",
  "label", "legend", "li", "link",
  "main", "map", "mark", "menu", "meta", "meter",
  "nav", "noscript",
  "object", "ol", "optgroup", "option", "output",
  "p", "picture", "pre", "progress",
  "q",
  "rp", "rt", "ruby",
  "s", "samp", "script", "search", "section", "select", "small", "source", "span", "strong", "style", "sub", "summary", "sup",
  "table", "tbody", "td", "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr", "track",
  "u", "ul",
  "var", "video",
  "wbr",
  // SVG elements
  "svg", "path", "circle", "ellipse", "line", "polygon", "polyline", "rect",
  "g", "defs", "symbol", "use", "clippath", "mask",
  "text", "tspan", "textpath",
  "image", "switch", "foreignobject",
  "desc", "metadata", "title",
  "lineargradient", "radialgradient", "stop",
  "filter", "fegaussianblur", "feoffset", "feblend", "fecolormatrix", "fecomponenttransfer", "fecomposite", "feconvolvematrix", "fediffuselighting", "fedisplacementmap", "fedropshadow", "feflood", "fefunca", "fefuncb", "fefuncg", "fefuncr", "feimage", "femerge", "femergenode", "femorphology", "fepointlight", "fespecularlighting", "fespotlight", "fetile", "feturbulence",
  "animate", "animatemotion", "animatetransform", "set",
  "marker", "pattern",
]);

export function isStandardHtmlTag(tagName: string): boolean {
  return STANDARD_HTML_TAGS.has(tagName.toLowerCase());
}
