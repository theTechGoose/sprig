/**
 * Tests for HTML-only components (no mod.ts required)
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { join } from "@std/path";
import { scanSprigApp } from "../parser/scanner.ts";
import { generateComponent } from "../generator/components.ts";
import type { SprigComponent } from "../parser/mod.ts";

// Helper to create temp directory with HTML-only component
async function createTempComponent(
  folderName: string,
  htmlContent: string,
): Promise<{ srcDir: string; cleanup: () => Promise<void> }> {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_html_test_" });
  const srcDir = join(tempDir, "src");
  const componentDir = join(srcDir, "components", folderName);

  await Deno.mkdir(componentDir, { recursive: true });
  await Deno.writeTextFile(join(componentDir, "mod.html"), htmlContent);

  return {
    srcDir,
    cleanup: async () => {
      await Deno.remove(tempDir, { recursive: true });
    },
  };
}

Deno.test("HTML-only component is discovered", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "user-card",
    "<div>Hello {{name}}</div>",
  );

  try {
    const result = await scanSprigApp(srcDir);

    assertEquals(result.components.length, 1);
    assertEquals(result.domainComponents.length, 1);

    const comp = result.components[0];
    assertEquals(comp.metadata.className, "UserCard");
    assertEquals(comp.template, "<div>Hello {{name}}</div>");
    assertEquals(comp.source, ""); // No TS source
    assertEquals(comp.originalFilename, "mod.html");
  } finally {
    await cleanup();
  }
});

Deno.test("HTML-only component extracts props from interpolation", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "profile",
    "<div>{{firstName}} {{lastName}} - Age: {{age}}</div>",
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];

    assertEquals(comp.inputs.length, 3);
    const propNames = comp.inputs.map((i) => i.name).sort();
    assertEquals(propNames, ["age", "firstName", "lastName"]);
  } finally {
    await cleanup();
  }
});

Deno.test("HTML-only component extracts props from bindings", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "button",
    '<button [disabled]="isDisabled" [title]="tooltip">{{label}}</button>',
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];

    const propNames = comp.inputs.map((i) => i.name).sort();
    assertEquals(propNames, ["isDisabled", "label", "tooltip"]);
  } finally {
    await cleanup();
  }
});

Deno.test("HTML-only component derives className from folder", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "my-awesome-component",
    "<div>Test</div>",
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];

    assertEquals(comp.metadata.className, "MyAwesomeComponent");
  } finally {
    await cleanup();
  }
});

Deno.test("HTML-only component generates valid TSX", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "greeting",
    "<p>Hello, {{name}}!</p>",
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];
    const generated = generateComponent(comp, [], []);

    // Should be in components/ folder (not islands, no events)
    assertEquals(generated.outputPath, "components/Greeting.tsx");

    // Should have props interface
    assertStringIncludes(generated.content, "interface GreetingProps");
    assertStringIncludes(generated.content, "name?:");

    // Should destructure props
    assertStringIncludes(generated.content, "props.name");

    // Should have the interpolation
    assertStringIncludes(generated.content, "{name}");
  } finally {
    await cleanup();
  }
});

Deno.test("HTML-only component with events stays server component", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "click-button",
    '<button (click)="onClick()">{{label}}</button>',
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];
    const generated = generateComponent(comp, [], []);

    // HTML-only components are always server components (never islands)
    // Even with event bindings, they can't have client-side logic
    assertEquals(generated.outputPath, "components/ClickButton.tsx");
  } finally {
    await cleanup();
  }
});

Deno.test("mod.ts takes precedence over HTML-only", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_html_test_" });
  const srcDir = join(tempDir, "src");
  const componentDir = join(srcDir, "components", "my-comp");

  try {
    await Deno.mkdir(componentDir, { recursive: true });
    await Deno.writeTextFile(
      join(componentDir, "mod.html"),
      "<div>HTML content</div>",
    );
    await Deno.writeTextFile(
      join(componentDir, "mod.ts"),
      `
@Component({ template: './mod.html' })
export class MyComp {
  someMethod() {}
}
`,
    );

    const result = await scanSprigApp(srcDir);

    // Should only have one component (from mod.ts, not duplicate)
    assertEquals(result.components.length, 1);
    assertEquals(result.components[0].metadata.className, "MyComp");
    // Should have TS source
    assertStringIncludes(result.components[0].source, "someMethod");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("HTML-only ignores common keywords", async () => {
  const { srcDir, cleanup } = await createTempComponent(
    "conditional",
    "<div *if=\"true\">{{value}} is {{true ? 'yes' : 'no'}}</div>",
  );

  try {
    const result = await scanSprigApp(srcDir);
    const comp = result.components[0];

    // Should only have 'value', not 'true'
    const propNames = comp.inputs.map((i) => i.name);
    assertEquals(propNames.includes("value"), true);
    assertEquals(propNames.includes("true"), false);
  } finally {
    await cleanup();
  }
});
