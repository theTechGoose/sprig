/**
 * Tests for custom directive integration
 */

import { assertEquals } from "jsr:@std/assert";
import {
  DirectiveRegistry,
  transformCustomDirective,
  collectCustomDirectiveUsages,
  generateDirectiveImports,
} from "../transformer/custom-directives.ts";
import { generateDirective, generateDirectivesIndex } from "../generator/directives.ts";
import type { SprigDirective } from "../parser/mod.ts";

function createMockDirective(selector: string, className: string): SprigDirective {
  return {
    path: `/src/directives/${selector}.directive.ts`,
    relativePath: `directives/${selector}.directive.ts`,
    metadata: {
      selector: `*${selector}`,
      className,
    },
    source: `
@Directive({ selector: '*${selector}' })
export class ${className} {
  transform(element: Element, value: unknown) {
    return { style: { backgroundColor: value } };
  }
}
`,
  };
}

Deno.test("DirectiveRegistry - register and get directive", () => {
  const registry = new DirectiveRegistry();
  const directive = createMockDirective("highlight", "HighlightDirective");

  registry.register(directive, "/dist");

  const registered = registry.get("highlight");

  assertEquals(registered?.selector, "highlight");
  assertEquals(registered?.className, "HighlightDirective");
  assertEquals(registered?.transformFn, "applyHighlightDirective");
  assertEquals(registered?.importPath, "@/directives/highlight.ts");
});

Deno.test("DirectiveRegistry - has directive", () => {
  const registry = new DirectiveRegistry();
  const directive = createMockDirective("highlight", "HighlightDirective");

  registry.register(directive, "/dist");

  assertEquals(registry.has("highlight"), true);
  assertEquals(registry.has("unknown"), false);
});

Deno.test("DirectiveRegistry - getAll directives", () => {
  const registry = new DirectiveRegistry();

  registry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");
  registry.register(createMockDirective("tooltip", "TooltipDirective"), "/dist");

  const all = registry.getAll();

  assertEquals(all.length, 2);
  assertEquals(all.map((d) => d.selector).sort(), ["highlight", "tooltip"]);
});

Deno.test("transformCustomDirective - generates spread expression", () => {
  const registry = new DirectiveRegistry();
  registry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const result = transformCustomDirective("highlight", "'yellow'", registry);

  assertEquals(result?.spreadExpr, "{...applyHighlightDirective({}, 'yellow')}");
  assertEquals(result?.importInfo.transformFn, "applyHighlightDirective");
});

Deno.test("transformCustomDirective - returns null for unknown directive", () => {
  const registry = new DirectiveRegistry();

  const result = transformCustomDirective("unknown", "'value'", registry);

  assertEquals(result, null);
});

Deno.test("collectCustomDirectiveUsages - finds custom directives", () => {
  const registry = new DirectiveRegistry();
  registry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");
  registry.register(createMockDirective("tooltip", "TooltipDirective"), "/dist");

  const template = `
<div *highlight="'yellow'">
  <span *tooltip="'Help text'">Hover me</span>
</div>
`;

  const usages = collectCustomDirectiveUsages(template, registry);

  assertEquals(usages.size, 2);
  assertEquals(usages.has("highlight"), true);
  assertEquals(usages.has("tooltip"), true);
});

Deno.test("collectCustomDirectiveUsages - ignores built-in directives", () => {
  const registry = new DirectiveRegistry();
  registry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");

  const template = `
<div *if="showIt">
  <span *for="let item of items">
    <p *highlight="'yellow'">Text</p>
  </span>
</div>
`;

  const usages = collectCustomDirectiveUsages(template, registry);

  assertEquals(usages.size, 1);
  assertEquals(usages.has("highlight"), true);
  assertEquals(usages.has("if"), false);
  assertEquals(usages.has("for"), false);
});

Deno.test("generateDirectiveImports - creates import statements", () => {
  const registry = new DirectiveRegistry();
  registry.register(createMockDirective("highlight", "HighlightDirective"), "/dist");
  registry.register(createMockDirective("tooltip", "TooltipDirective"), "/dist");

  const usages = new Set(["highlight", "tooltip"]);
  const imports = generateDirectiveImports(usages, registry);

  assertEquals(imports.length, 2);
  assertEquals(
    imports.includes('import { applyHighlightDirective } from "@/directives/highlight.ts";'),
    true,
  );
  assertEquals(
    imports.includes('import { applyTooltipDirective } from "@/directives/tooltip.ts";'),
    true,
  );
});

Deno.test("generateDirective - creates wrapper file", () => {
  const directive = createMockDirective("highlight", "HighlightDirective");
  const srcDir = "/project/src";

  const result = generateDirective(directive, srcDir);

  assertEquals(result.outputPath, "directives/highlight.ts");
  assertEquals(result.content.includes("import { HighlightDirective }"), true);
  assertEquals(result.content.includes("export function applyHighlightDirective"), true);
  assertEquals(result.content.includes("const _highlightInstance"), true);
});

Deno.test("generateDirectivesIndex - creates exports", () => {
  const directives = [
    createMockDirective("highlight", "HighlightDirective"),
    createMockDirective("tooltip", "TooltipDirective"),
  ];

  const result = generateDirectivesIndex(directives);

  assertEquals(
    result.includes('export { applyHighlightDirective } from "./highlight.ts";'),
    true,
  );
  assertEquals(
    result.includes('export { applyTooltipDirective } from "./tooltip.ts";'),
    true,
  );
});

Deno.test("generateDirectivesIndex - empty for no directives", () => {
  const result = generateDirectivesIndex([]);

  assertEquals(result.includes("No custom directives"), true);
});
