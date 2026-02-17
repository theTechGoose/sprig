/**
 * Tests for custom pipe integration
 */

import { assertEquals } from "jsr:@std/assert";
import {
  PipeRegistry,
  collectCustomPipeUsages,
  generatePipeImports,
} from "../transformer/custom-pipes.ts";
import { generatePipe, generatePipesIndex } from "../generator/pipes.ts";
import type { SprigPipe } from "../parser/mod.ts";

function createMockPipe(name: string, className: string, pure = true): SprigPipe {
  return {
    path: `/src/pipes/${name}.pipe.ts`,
    relativePath: `pipes/${name}.pipe.ts`,
    metadata: {
      name,
      className,
      pure,
    },
    source: `
@Pipe({ name: '${name}' })
export class ${className} {
  transform(value: string): string {
    return value.split('').reverse().join('');
  }
}
`,
  };
}

Deno.test("PipeRegistry - register and get pipe", () => {
  const registry = new PipeRegistry();
  const pipe = createMockPipe("reverse", "ReversePipe");

  registry.register(pipe, "/dist");

  const registered = registry.get("reverse");

  assertEquals(registered?.name, "reverse");
  assertEquals(registered?.className, "ReversePipe");
  assertEquals(registered?.functionName, "reverse");
  assertEquals(registered?.importPath, "@/pipes/reverse.ts");
  assertEquals(registered?.pure, true);
});

Deno.test("PipeRegistry - has pipe", () => {
  const registry = new PipeRegistry();
  const pipe = createMockPipe("reverse", "ReversePipe");

  registry.register(pipe, "/dist");

  assertEquals(registry.has("reverse"), true);
  assertEquals(registry.has("unknown"), false);
});

Deno.test("PipeRegistry - getAll pipes", () => {
  const registry = new PipeRegistry();

  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  registry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const all = registry.getAll();

  assertEquals(all.length, 2);
  assertEquals(all.map((p) => p.name).sort(), ["reverse", "truncate"]);
});

Deno.test("PipeRegistry - toRecord", () => {
  const registry = new PipeRegistry();

  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  registry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const record = registry.toRecord();

  assertEquals(record["reverse"], "reverse");
  assertEquals(record["truncate"], "truncate");
});

Deno.test("collectCustomPipeUsages - finds custom pipes", () => {
  const registry = new PipeRegistry();
  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  registry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const template = `
<p>{{name | reverse}}</p>
<p>{{description | truncate:50}}</p>
`;

  const usages = collectCustomPipeUsages(template, registry);

  assertEquals(usages.size, 2);
  assertEquals(usages.has("reverse"), true);
  assertEquals(usages.has("truncate"), true);
});

Deno.test("collectCustomPipeUsages - ignores built-in pipes", () => {
  const registry = new PipeRegistry();
  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");

  const template = `
<p>{{name | uppercase}}</p>
<p>{{title | reverse}}</p>
<p>{{date | date:'short'}}</p>
`;

  const usages = collectCustomPipeUsages(template, registry);

  assertEquals(usages.size, 1);
  assertEquals(usages.has("reverse"), true);
  assertEquals(usages.has("uppercase"), false); // Built-in, not registered
});

Deno.test("collectCustomPipeUsages - handles multiple pipe usages", () => {
  const registry = new PipeRegistry();
  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  registry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const template = `
<p>{{name | reverse}}</p>
<p>{{desc | truncate:10}}</p>
`;

  const usages = collectCustomPipeUsages(template, registry);

  // Finds both pipes in separate interpolations
  assertEquals(usages.has("reverse"), true);
  assertEquals(usages.has("truncate"), true);
});

Deno.test("generatePipeImports - creates import statements", () => {
  const registry = new PipeRegistry();
  registry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  registry.register(createMockPipe("truncate", "TruncatePipe"), "/dist");

  const usages = new Set(["reverse", "truncate"]);
  const imports = generatePipeImports(usages, registry);

  assertEquals(imports.length, 2);
  assertEquals(
    imports.includes('import { reverse } from "@/pipes/reverse.ts";'),
    true,
  );
  assertEquals(
    imports.includes('import { truncate } from "@/pipes/truncate.ts";'),
    true,
  );
});

Deno.test("generatePipe - creates wrapper file", () => {
  const pipe = createMockPipe("reverse", "ReversePipe");
  const srcDir = "/project/src";

  const result = generatePipe(pipe, srcDir);

  assertEquals(result.outputPath, "pipes/reverse.ts");
  assertEquals(result.content.includes("import { ReversePipe }"), true);
  assertEquals(result.content.includes("export function reverse"), true);
  assertEquals(result.content.includes("const _reverseInstance"), true);
  assertEquals(result.content.includes("_reverseInstance.transform"), true);
});

Deno.test("generatePipesIndex - creates exports", () => {
  const pipes = [
    createMockPipe("reverse", "ReversePipe"),
    createMockPipe("truncate", "TruncatePipe"),
  ];

  const result = generatePipesIndex(pipes);

  assertEquals(
    result.includes('export { reverse } from "./reverse.ts";'),
    true,
  );
  assertEquals(
    result.includes('export { truncate } from "./truncate.ts";'),
    true,
  );
});

Deno.test("generatePipesIndex - empty for no pipes", () => {
  const result = generatePipesIndex([]);

  assertEquals(result.includes("No custom pipes"), true);
});

Deno.test("PipeRegistry - impure pipe", () => {
  const registry = new PipeRegistry();
  const pipe = createMockPipe("random", "RandomPipe", false);

  registry.register(pipe, "/dist");

  const registered = registry.get("random");

  assertEquals(registered?.pure, false);
});
