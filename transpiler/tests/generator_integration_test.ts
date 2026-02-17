/**
 * Integration tests for the full generator pipeline
 * Verifies that custom pipes and directives discovered by the scanner
 * are automatically used when generating components.
 */

import { assertEquals } from "jsr:@std/assert";
import { generateComponent } from "../generator/components.ts";
import { directiveRegistry, pipeRegistry } from "../transformer/mod.ts";
import type { SprigComponent } from "../parser/mod.ts";
import type { SprigDirective } from "../parser/directive.ts";
import type { SprigPipe } from "../parser/pipe.ts";

// Clear registries before each test
function clearRegistries() {
  directiveRegistry.clear();
  pipeRegistry.clear();
}

function createMockComponent(
  name: string,
  template: string,
  island = false,
): SprigComponent {
  return {
    path: `/src/components/${name}`,
    relativePath: `components/${name}`,
    type: "component",
    metadata: {
      className: name,
      template: "./mod.html",
      island,
    },
    template,
    source: `@Component({ template: './mod.html' }) export class ${name} {}`,
    originalFilename: "mod.ts",
    inputs: [],
  };
}

function createMockPipe(name: string, className: string): SprigPipe {
  return {
    path: `/src/pipes/${name}.pipe.ts`,
    relativePath: `pipes/${name}.pipe.ts`,
    metadata: { name, className, pure: true },
    source: `@Pipe({ name: '${name}' }) export class ${className} {}`,
  };
}

function createMockDirective(name: string, className: string): SprigDirective {
  return {
    path: `/src/directives/${name}.directive.ts`,
    relativePath: `directives/${name}.directive.ts`,
    metadata: { selector: `*${name}`, className },
    source: `@Directive({ selector: '*${name}' }) export class ${className} {}`,
  };
}

Deno.test("generateComponent uses registered custom pipe", () => {
  clearRegistries();

  // Register a custom pipe (simulating what mod.ts does after scanning)
  pipeRegistry.register(createMockPipe("reverse", "ReversePipe"), "/dist");

  // Components with interpolation need island: true
  const component = createMockComponent(
    "TestComponent",
    `<p>{{name | reverse}}</p>`,
    true, // island
  );

  const result = generateComponent(component, [], []);

  // The generated code should use the custom pipe function
  assertEquals(result.content.includes("reverse(name)"), true);
  // And it should import the pipe function
  assertEquals(result.content.includes('import { reverse }'), true);
});

Deno.test("generateComponent uses registered custom directive", () => {
  clearRegistries();

  // Register a custom directive
  directiveRegistry.register(
    createMockDirective("highlight", "HighlightDirective"),
    "/dist",
  );

  const component = createMockComponent(
    "TestComponent",
    `<p *highlight="'yellow'">Text</p>`,
  );

  const result = generateComponent(component, [], []);

  // The generated code should use the custom directive function
  assertEquals(result.content.includes("applyHighlightDirective"), true);
});

Deno.test("generateComponent uses custom pipe in binding", () => {
  clearRegistries();

  pipeRegistry.register(createMockPipe("format", "FormatPipe"), "/dist");

  // Components with bindings need island: true
  const component = createMockComponent(
    "TestComponent",
    `<div [title]="name | format"></div>`,
    true, // island
  );

  const result = generateComponent(component, [], []);

  assertEquals(result.content.includes("format(name)"), true);
});

Deno.test("generateComponent combines custom pipe and directive", () => {
  clearRegistries();

  pipeRegistry.register(createMockPipe("reverse", "ReversePipe"), "/dist");
  directiveRegistry.register(
    createMockDirective("tooltip", "TooltipDirective"),
    "/dist",
  );

  // Components with interpolation need island: true
  const component = createMockComponent(
    "TestComponent",
    `<p *tooltip="message | reverse">{{name | reverse}}</p>`,
    true, // island
  );

  const result = generateComponent(component, [], []);

  assertEquals(result.content.includes("reverse(name)"), true);
  assertEquals(result.content.includes("applyTooltipDirective"), true);
});
