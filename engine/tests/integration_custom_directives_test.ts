/**
 * Integration tests for custom directives in the full transformation pipeline
 * These tests verify that custom directives registered in the DirectiveRegistry
 * are actually used when transforming templates.
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";
import { directiveRegistry, pipeRegistry } from "../transformer/mod.ts";
import type { SprigDirective } from "../parser/mod.ts";

function createMockDirective(name: string, className: string): SprigDirective {
  return {
    path: `/src/directives/${name}.directive.ts`,
    relativePath: `directives/${name}.directive.ts`,
    metadata: {
      selector: `*${name}`,
      className,
    },
    source: `
@Directive({ selector: '*${name}' })
export class ${className} {
  transform(element: unknown, value: unknown): Record<string, unknown> {
    return { style: { backgroundColor: value } };
  }
}
`,
  };
}

Deno.test("custom directive is transformed with spread expression", () => {
  // Register a custom directive
  directiveRegistry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const html = `<p *highlight="'yellow'">Text</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // The custom directive should generate a spread with the transform function
  assertEquals(result.jsx.includes("applyHighlightDirective"), true);
  assertEquals(result.jsx.includes("{...applyHighlightDirective("), true);
});

Deno.test("custom directive with variable expression", () => {
  directiveRegistry.register(createMockDirective("tooltip", "TooltipDirective"), "/dist");

  const html = `<button *tooltip="tooltipText">Hover me</button>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  assertEquals(result.jsx.includes("applyTooltipDirective"), true);
  assertEquals(result.jsx.includes("tooltipText"), true);
});

Deno.test("custom directive combined with other attributes", () => {
  directiveRegistry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const html = `<p class="text" *highlight="color" id="main">Text</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // Should have both the directive spread and regular attributes
  assertEquals(result.jsx.includes("applyHighlightDirective"), true);
  assertEquals(result.jsx.includes('class="text"') || result.jsx.includes('className="text"'), true);
  assertEquals(result.jsx.includes('id="main"'), true);
});

Deno.test("multiple custom directives on same element", () => {
  directiveRegistry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");
  directiveRegistry.register(createMockDirective("tooltip", "TooltipDirective"), "/dist");

  const html = `<p *highlight="'yellow'" *tooltip="'Help text'">Text</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  assertEquals(result.jsx.includes("applyHighlightDirective"), true);
  assertEquals(result.jsx.includes("applyTooltipDirective"), true);
});

Deno.test("custom directive does not conflict with built-in *if", () => {
  directiveRegistry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const html = `<p *if="show" *highlight="'yellow'">Text</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // *if should still work as conditional
  assertEquals(result.jsx.includes("show &&") || result.jsx.includes("show ?"), true);
  // Custom directive should also be applied
  assertEquals(result.jsx.includes("applyHighlightDirective"), true);
});

Deno.test("custom directive does not conflict with built-in *for", () => {
  directiveRegistry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const html = `<li *for="let item of items" *highlight="item.color">{{item.name}}</li>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // *for should generate map
  assertEquals(result.jsx.includes(".map("), true);
  // Custom directive should also be applied
  assertEquals(result.jsx.includes("applyHighlightDirective"), true);
});
