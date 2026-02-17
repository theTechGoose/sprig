/**
 * Tests for SCSS/CSS style compilation
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { join } from "@std/path";
import { compileComponentStyle, writeComponentStyles } from "../generator/styles.ts";
import type { SprigComponent } from "../parser/mod.ts";

function createMockComponent(
  name: string,
  styling?: string,
  island = false,
): SprigComponent {
  return {
    path: `/src/components/${name}`,
    relativePath: `components/${name}`,
    type: "component",
    metadata: {
      className: name,
      template: "./mod.html",
      styling,
      island,
    },
    template: "<div>Test</div>",
    source: "",
    originalFilename: "mod.html",
    inputs: [],
  };
}

Deno.test("compileComponentStyle - no styling returns null", async () => {
  const component = createMockComponent("NoStyles");
  const result = await compileComponentStyle(component);

  assertEquals(result, null);
});

Deno.test("compileComponentStyle - compiles SCSS", async () => {
  // Create temp SCSS file
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_scss_test_" });
  const scssPath = join(tempDir, "mod.scss");

  await Deno.writeTextFile(scssPath, `
$primary: #007bff;

.button {
  color: $primary;

  &:hover {
    color: darken($primary, 10%);
  }
}
`);

  const component: SprigComponent = {
    path: tempDir,
    relativePath: "components/button",
    type: "component",
    metadata: {
      className: "Button",
      template: "./mod.html",
      styling: "./mod.scss",
      island: false,
    },
    template: "<button>Click</button>",
    source: "",
    originalFilename: "mod.html",
    inputs: [],
  };

  try {
    const result = await compileComponentStyle(component);

    assertEquals(result !== null, true);
    assertEquals(result!.outputPath, "static/css/components/Button.css");
    // SCSS variables should be compiled
    assertStringIncludes(result!.css, "#007bff");
    // Nested selectors should be flattened
    assertStringIncludes(result!.css, ".button");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("compileComponentStyle - passes through CSS", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_css_test_" });
  const cssPath = join(tempDir, "mod.css");

  await Deno.writeTextFile(cssPath, `.card { padding: 1rem; }`);

  const component: SprigComponent = {
    path: tempDir,
    relativePath: "components/card",
    type: "component",
    metadata: {
      className: "Card",
      template: "./mod.html",
      styling: "./mod.css",
      island: false,
    },
    template: "<div>Card</div>",
    source: "",
    originalFilename: "mod.html",
    inputs: [],
  };

  try {
    const result = await compileComponentStyle(component);

    assertEquals(result !== null, true);
    assertStringIncludes(result!.css, ".card");
    assertStringIncludes(result!.css, "padding");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("compileComponentStyle - island goes to islands folder", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_scss_test_" });
  const scssPath = join(tempDir, "mod.scss");

  await Deno.writeTextFile(scssPath, `.counter { color: red; }`);

  const component: SprigComponent = {
    path: tempDir,
    relativePath: "components/counter",
    type: "component",
    metadata: {
      className: "Counter",
      template: "./mod.html",
      styling: "./mod.scss",
      island: true,
    },
    template: "<div>Counter</div>",
    source: "",
    originalFilename: "mod.html",
    inputs: [],
  };

  try {
    const result = await compileComponentStyle(component);

    assertEquals(result!.outputPath, "static/css/islands/Counter.css");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});

Deno.test("writeComponentStyles - writes CSS files", async () => {
  const tempDir = await Deno.makeTempDir({ prefix: "sprig_scss_test_" });
  const componentDir = join(tempDir, "src", "components", "card");
  const outDir = join(tempDir, "dist");

  await Deno.mkdir(componentDir, { recursive: true });
  await Deno.writeTextFile(join(componentDir, "mod.scss"), `
.card {
  $radius: 8px;
  border-radius: $radius;
}
`);

  const components: SprigComponent[] = [{
    path: componentDir,
    relativePath: "components/card",
    type: "component",
    metadata: {
      className: "Card",
      template: "./mod.html",
      styling: "./mod.scss",
      island: false,
    },
    template: "<div>Card</div>",
    source: "",
    originalFilename: "mod.html",
    inputs: [],
  }];

  try {
    const styleMap = await writeComponentStyles(components, outDir);

    // Should return the CSS path
    assertEquals(styleMap.get("Card"), "/static/css/components/Card.css");

    // File should exist
    const cssContent = await Deno.readTextFile(
      join(outDir, "static/css/components/Card.css")
    );
    assertStringIncludes(cssContent, "border-radius");
  } finally {
    await Deno.remove(tempDir, { recursive: true });
  }
});
