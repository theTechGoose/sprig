/**
 * Tests for deno.json reading, parsing, and merging
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import {
  readDenoJson,
  mergeImports,
  generateDistDenoJson,
  generateDistDenoJsonConfig,
  getFreshBoilerplateImports,
  type DenoJson,
} from "../config/deno-json.ts";

// =============================================================================
// mergeImports tests
// =============================================================================

Deno.test("mergeImports - source imports override Fresh imports", () => {
  const sourceImports = {
    "@std/path": "jsr:@std/path@^1.0.0",
  };
  const freshImports = {
    "@/": "./",
    "fresh": "jsr:@fresh/core@^2.2.0",
    "@std/path": "jsr:@std/path@^0.224.0",
  };

  const result = mergeImports(sourceImports, freshImports);

  // Source wins on conflict
  assertEquals(result["@std/path"], "jsr:@std/path@^1.0.0");
  // Fresh imports preserved
  assertEquals(result["@/"], "./");
  assertEquals(result["fresh"], "jsr:@fresh/core@^2.2.0");
});

Deno.test("mergeImports - adds source imports to Fresh imports", () => {
  const sourceImports = {
    "@my/utils": "./shared/utils.ts",
    "@my/types": "./types/index.ts",
  };
  const freshImports = {
    "@/": "./",
    "fresh": "jsr:@fresh/core@^2.2.0",
  };

  const result = mergeImports(sourceImports, freshImports);

  // All imports present
  assertEquals(result["@/"], "./");
  assertEquals(result["fresh"], "jsr:@fresh/core@^2.2.0");
  assertEquals(result["@my/utils"], "./shared/utils.ts");
  assertEquals(result["@my/types"], "./types/index.ts");
});

Deno.test("mergeImports - empty source imports uses Fresh defaults", () => {
  const sourceImports = {};
  const freshImports = getFreshBoilerplateImports();

  const result = mergeImports(sourceImports, freshImports);

  assertEquals(result, freshImports);
});

// =============================================================================
// generateDistDenoJson tests
// =============================================================================

Deno.test("generateDistDenoJson - includes Fresh tasks", () => {
  const result = generateDistDenoJson(null);
  const parsed = JSON.parse(result);

  assertEquals(parsed.tasks.dev, "vite");
  assertEquals(parsed.tasks.build, "vite build");
  assertEquals(parsed.tasks.start, "deno serve -A _fresh/server.js");
});

Deno.test("generateDistDenoJson - includes compiler options", () => {
  const result = generateDistDenoJson(null);
  const parsed = JSON.parse(result);

  assertEquals(parsed.compilerOptions.jsx, "precompile");
  assertEquals(parsed.compilerOptions.jsxImportSource, "preact");
  assertEquals(parsed.compilerOptions.experimentalDecorators, true);
  assertEquals(parsed.compilerOptions.emitDecoratorMetadata, true);
});

Deno.test("generateDistDenoJson - merges source imports", () => {
  const sourceDenoJson: DenoJson = {
    imports: {
      "@my/utils": "./shared/utils.ts",
      "@std/path": "jsr:@std/path@^1.0.0",
    },
  };

  const result = generateDistDenoJson(sourceDenoJson);
  const parsed = JSON.parse(result);

  // Source imports present
  assertEquals(parsed.imports["@my/utils"], "./shared/utils.ts");
  // Source wins on conflict
  assertEquals(parsed.imports["@std/path"], "jsr:@std/path@^1.0.0");
  // Fresh imports still present
  assertEquals(parsed.imports["fresh"], "jsr:@fresh/core@^2.2.0");
  assertEquals(parsed.imports["@/"], "./");
});

Deno.test("generateDistDenoJson - null source uses Fresh defaults only", () => {
  const result = generateDistDenoJson(null);
  const parsed = JSON.parse(result);
  const freshImports = getFreshBoilerplateImports();

  // All Fresh imports present
  for (const [key, value] of Object.entries(freshImports)) {
    assertEquals(parsed.imports[key], value);
  }
});

// =============================================================================
// generateDistDenoJsonConfig tests
// =============================================================================

Deno.test("generateDistDenoJsonConfig - returns object instead of string", () => {
  const result = generateDistDenoJsonConfig(null);

  assertEquals(typeof result, "object");
  assertEquals(result.nodeModulesDir, "manual");
  assertEquals(result.tasks?.dev, "vite");
});

Deno.test("generateDistDenoJsonConfig - matches JSON output", () => {
  const sourceDenoJson: DenoJson = {
    imports: { "@my/lib": "./lib/index.ts" },
  };

  const configResult = generateDistDenoJsonConfig(sourceDenoJson);
  const jsonResult = JSON.parse(generateDistDenoJson(sourceDenoJson));

  assertEquals(configResult.imports, jsonResult.imports);
  assertEquals(configResult.tasks, jsonResult.tasks);
});

// =============================================================================
// getFreshBoilerplateImports tests
// =============================================================================

Deno.test("getFreshBoilerplateImports - includes essential Fresh imports", () => {
  const imports = getFreshBoilerplateImports();

  assertEquals(imports["@/"], "./");
  assertEquals(imports["fresh"], "jsr:@fresh/core@^2.2.0");
  assertEquals(imports["preact"], "npm:preact@^10.27.2");
  assertEquals(imports["@preact/signals"], "npm:@preact/signals@^2.5.0");
  assertEquals(imports["@fresh/plugin-vite"], "jsr:@fresh/plugin-vite@^1.0.8");
  assertEquals(imports["vite"], "npm:vite@^7.1.3");
});

// =============================================================================
// readDenoJson tests (requires temp files)
// =============================================================================

Deno.test("readDenoJson - reads valid deno.json", async () => {
  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/deno.json`;

  await Deno.writeTextFile(
    tempFile,
    JSON.stringify({
      name: "test-app",
      imports: { "@/": "./" },
    })
  );

  const result = await readDenoJson(tempFile);

  assertEquals(result?.name, "test-app");
  assertEquals(result?.imports?.["@/"], "./");

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("readDenoJson - returns null for non-existent file", async () => {
  const result = await readDenoJson("/nonexistent/path/deno.json");
  assertEquals(result, null);
});

Deno.test("readDenoJson - returns null for invalid JSON", async () => {
  const tempDir = await Deno.makeTempDir();
  const tempFile = `${tempDir}/deno.json`;

  await Deno.writeTextFile(tempFile, "not valid json {{{");

  const result = await readDenoJson(tempFile);
  assertEquals(result, null);

  await Deno.remove(tempDir, { recursive: true });
});
