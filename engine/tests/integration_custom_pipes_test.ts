/**
 * Integration tests for custom pipes in the full transformation pipeline
 * These tests verify that custom pipes registered in the PipeRegistry
 * are actually used when transforming templates.
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";
import { pipeRegistry } from "../transformer/mod.ts";
import type { SprigPipe } from "../parser/mod.ts";

function createMockPipe(name: string, className: string): SprigPipe {
  return {
    path: `/src/pipes/${name}.pipe.ts`,
    relativePath: `pipes/${name}.pipe.ts`,
    metadata: {
      name,
      className,
      pure: true,
    },
    source: `
@Pipe({ name: '${name}' })
export class ${className} {
  transform(value: string): string {
    return value;
  }
}
`,
  };
}

Deno.test("custom pipe is transformed in template interpolation", () => {
  // Register a custom pipe
  pipeRegistry.register(createMockPipe("reverse", "ReversePipe"), "/dist");

  const html = `<p>{{name | reverse}}</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // The custom pipe should be called as a function
  assertEquals(result.jsx.includes("reverse(name)"), true);
});

Deno.test("custom pipe with args is transformed correctly", () => {
  pipeRegistry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const html = `<p>{{description | truncate:50}}</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // Should transform to function call with args
  assertEquals(result.jsx.includes("truncate(description, 50)"), true);
});

Deno.test("custom pipe chained with built-in pipe", () => {
  pipeRegistry.register(createMockPipe("reverse", "ReversePipe"), "/dist");

  const html = `<p>{{name | reverse | uppercase}}</p>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // Should chain: uppercase wraps reverse
  assertEquals(result.jsx.includes("reverse(name)"), true);
  assertEquals(result.jsx.includes("toUpperCase()"), true);
});

Deno.test("multiple custom pipes in same template", () => {
  pipeRegistry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  pipeRegistry.register(createMockPipe("highlight", "HighlightPipe"), "/dist");

  const html = `
<p>{{name | reverse}}</p>
<p>{{title | highlight}}</p>
`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  assertEquals(result.jsx.includes("reverse(name)"), true);
  assertEquals(result.jsx.includes("highlight(title)"), true);
});

Deno.test("custom pipe in binding expression", () => {
  pipeRegistry.register(createMockPipe("format", "FormatPipe"), "/dist");

  const html = `<div [title]="name | format"></div>`;
  const result = htmlToJsx(html, [], pipeRegistry.toRecord());

  // Pipe should be transformed in binding
  assertEquals(result.jsx.includes("format(name)"), true);
});
