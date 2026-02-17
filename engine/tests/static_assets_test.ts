/**
 * Tests for static asset copying
 */

import { assertEquals } from "jsr:@std/assert";
import { join } from "@std/path";
import { exists } from "@std/fs";
import {
  copyStaticAssets,
  findStaticFolder,
  listStaticAssets,
} from "../generator/static-assets.ts";

// =============================================================================
// findStaticFolder tests
// =============================================================================

Deno.test("findStaticFolder - finds src/static", async () => {
  const tempDir = await Deno.makeTempDir();
  const staticDir = join(tempDir, "src", "static");

  await Deno.mkdir(staticDir, { recursive: true });

  const result = await findStaticFolder(tempDir);
  assertEquals(result, staticDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findStaticFolder - finds src/assets", async () => {
  const tempDir = await Deno.makeTempDir();
  const assetsDir = join(tempDir, "src", "assets");

  await Deno.mkdir(assetsDir, { recursive: true });

  const result = await findStaticFolder(tempDir);
  assertEquals(result, assetsDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findStaticFolder - finds static at root", async () => {
  const tempDir = await Deno.makeTempDir();
  const staticDir = join(tempDir, "static");

  await Deno.mkdir(staticDir, { recursive: true });

  const result = await findStaticFolder(tempDir);
  assertEquals(result, staticDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findStaticFolder - finds assets at root", async () => {
  const tempDir = await Deno.makeTempDir();
  const assetsDir = join(tempDir, "assets");

  await Deno.mkdir(assetsDir, { recursive: true });

  const result = await findStaticFolder(tempDir);
  assertEquals(result, assetsDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findStaticFolder - prefers src/static over static", async () => {
  const tempDir = await Deno.makeTempDir();
  const srcStaticDir = join(tempDir, "src", "static");
  const staticDir = join(tempDir, "static");

  await Deno.mkdir(srcStaticDir, { recursive: true });
  await Deno.mkdir(staticDir, { recursive: true });

  const result = await findStaticFolder(tempDir);
  assertEquals(result, srcStaticDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findStaticFolder - returns null when none found", async () => {
  const tempDir = await Deno.makeTempDir();

  const result = await findStaticFolder(tempDir);
  assertEquals(result, null);

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// copyStaticAssets tests
// =============================================================================

Deno.test("copyStaticAssets - copies files to dist/static", async () => {
  const tempDir = await Deno.makeTempDir();
  const srcStaticDir = join(tempDir, "src", "static");
  const outDir = join(tempDir, "dist");

  await Deno.mkdir(srcStaticDir, { recursive: true });
  await Deno.mkdir(outDir, { recursive: true });

  // Create test files
  await Deno.writeTextFile(join(srcStaticDir, "test.txt"), "hello");
  await Deno.writeTextFile(join(srcStaticDir, "style.css"), "body {}");

  await copyStaticAssets(tempDir, outDir);

  // Verify files copied
  assertEquals(await exists(join(outDir, "static", "test.txt")), true);
  assertEquals(await exists(join(outDir, "static", "style.css")), true);

  // Verify content
  const content = await Deno.readTextFile(join(outDir, "static", "test.txt"));
  assertEquals(content, "hello");

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("copyStaticAssets - copies nested directories", async () => {
  const tempDir = await Deno.makeTempDir();
  const srcStaticDir = join(tempDir, "src", "static");
  const outDir = join(tempDir, "dist");

  await Deno.mkdir(join(srcStaticDir, "images"), { recursive: true });
  await Deno.mkdir(join(srcStaticDir, "fonts"), { recursive: true });
  await Deno.mkdir(outDir, { recursive: true });

  // Create test files
  await Deno.writeTextFile(join(srcStaticDir, "images", "logo.svg"), "<svg/>");
  await Deno.writeTextFile(join(srcStaticDir, "fonts", "custom.woff"), "font");

  await copyStaticAssets(tempDir, outDir);

  // Verify nested files copied
  assertEquals(await exists(join(outDir, "static", "images", "logo.svg")), true);
  assertEquals(await exists(join(outDir, "static", "fonts", "custom.woff")), true);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("copyStaticAssets - does nothing when no static folder", async () => {
  const tempDir = await Deno.makeTempDir();
  const outDir = join(tempDir, "dist");

  await Deno.mkdir(outDir, { recursive: true });

  // Should not throw
  await copyStaticAssets(tempDir, outDir);

  // static folder should be created but empty
  // (or not created at all - depends on implementation)

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// listStaticAssets tests
// =============================================================================

Deno.test("listStaticAssets - lists all files", async () => {
  const tempDir = await Deno.makeTempDir();
  const srcStaticDir = join(tempDir, "src", "static");

  await Deno.mkdir(join(srcStaticDir, "images"), { recursive: true });

  await Deno.writeTextFile(join(srcStaticDir, "test.txt"), "hello");
  await Deno.writeTextFile(join(srcStaticDir, "images", "logo.png"), "png");

  const result = await listStaticAssets(tempDir);

  assertEquals(result?.length, 2);
  assertEquals(result?.includes("test.txt"), true);
  assertEquals(result?.includes("images/logo.png"), true);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("listStaticAssets - returns null when no static folder", async () => {
  const tempDir = await Deno.makeTempDir();

  const result = await listStaticAssets(tempDir);
  assertEquals(result, null);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("listStaticAssets - returns empty array for empty static folder", async () => {
  const tempDir = await Deno.makeTempDir();
  const srcStaticDir = join(tempDir, "src", "static");

  await Deno.mkdir(srcStaticDir, { recursive: true });

  const result = await listStaticAssets(tempDir);
  assertEquals(result?.length, 0);

  await Deno.remove(tempDir, { recursive: true });
});
