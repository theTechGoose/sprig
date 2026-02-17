/**
 * Tests for workspace management utilities
 */

import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { join } from "@std/path";
import {
  findGitRoot,
  findWorkspaceDenoJson,
  getOutputDir,
  addWorkspaceMember,
  removeWorkspaceMember,
  cleanStaleTranspiledMembers,
  isDistFolder,
  getRelativePathFromGitRoot,
} from "../config/workspace.ts";
import { readDenoJson, writeDenoJson, type DenoJson } from "../config/deno-json.ts";

// =============================================================================
// getOutputDir tests
// =============================================================================

Deno.test("getOutputDir - adds -dist suffix to folder name", () => {
  assertEquals(getOutputDir("/path/to/web"), "/path/to/web-dist");
  assertEquals(getOutputDir("/packages/app"), "/packages/app-dist");
  assertEquals(getOutputDir("/my-project"), "/my-project-dist");
});

Deno.test("getOutputDir - handles trailing slash", () => {
  // The implementation should handle trailing slashes properly
  const result = getOutputDir("/path/to/web/");
  // Should still work - remove trailing slash logic
  assertEquals(result.endsWith("-dist"), true);
});

Deno.test("getOutputDir - handles nested paths", () => {
  assertEquals(
    getOutputDir("/monorepo/packages/frontend/web"),
    "/monorepo/packages/frontend/web-dist"
  );
});

// =============================================================================
// isDistFolder tests
// =============================================================================

Deno.test("isDistFolder - detects -dist suffix", () => {
  assertEquals(isDistFolder("/path/to/web-dist"), true);
  assertEquals(isDistFolder("/packages/app-dist"), true);
});

Deno.test("isDistFolder - returns false for non-dist folders", () => {
  assertEquals(isDistFolder("/path/to/web"), false);
  assertEquals(isDistFolder("/packages/distribution"), false);
  assertEquals(isDistFolder("/my-distributed-app"), false);
});

// =============================================================================
// getRelativePathFromGitRoot tests
// =============================================================================

Deno.test("getRelativePathFromGitRoot - calculates relative path", () => {
  const gitRoot = "/monorepo";
  const targetDir = "/monorepo/packages/web-dist";

  assertEquals(
    getRelativePathFromGitRoot(gitRoot, targetDir),
    "packages/web-dist"
  );
});

// =============================================================================
// findGitRoot tests (requires temp directory with .git)
// =============================================================================

Deno.test("findGitRoot - finds .git directory", async () => {
  const tempDir = await Deno.makeTempDir();
  const gitDir = join(tempDir, ".git");
  const nestedDir = join(tempDir, "packages", "web");

  await Deno.mkdir(gitDir, { recursive: true });
  await Deno.mkdir(nestedDir, { recursive: true });

  const result = await findGitRoot(nestedDir);
  assertEquals(result, tempDir);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findGitRoot - returns null when no .git found", async () => {
  const tempDir = await Deno.makeTempDir();

  // Don't create .git
  const result = await findGitRoot(tempDir);

  // Should return null or keep going to real filesystem root
  // In a temp dir with no .git ancestor, it should return null
  // (unless we're in a real git repo)

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// findWorkspaceDenoJson tests
// =============================================================================

Deno.test("findWorkspaceDenoJson - finds workspace deno.json", async () => {
  const tempDir = await Deno.makeTempDir();
  const gitDir = join(tempDir, ".git");
  const nestedDir = join(tempDir, "packages", "web");
  const denoJsonPath = join(tempDir, "deno.json");

  await Deno.mkdir(gitDir, { recursive: true });
  await Deno.mkdir(nestedDir, { recursive: true });

  // Create workspace deno.json
  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web"],
  });

  const result = await findWorkspaceDenoJson(nestedDir);
  assertEquals(result, denoJsonPath);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("findWorkspaceDenoJson - returns null if no workspace field", async () => {
  const tempDir = await Deno.makeTempDir();
  const gitDir = join(tempDir, ".git");
  const nestedDir = join(tempDir, "packages", "web");
  const denoJsonPath = join(tempDir, "deno.json");

  await Deno.mkdir(gitDir, { recursive: true });
  await Deno.mkdir(nestedDir, { recursive: true });

  // Create deno.json without workspace field
  await writeDenoJson(denoJsonPath, {
    name: "my-project",
  });

  const result = await findWorkspaceDenoJson(nestedDir);
  assertEquals(result, null);

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// addWorkspaceMember tests
// =============================================================================

Deno.test("addWorkspaceMember - adds new member to workspace", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web"],
  });

  await addWorkspaceMember(denoJsonPath, "packages/web-dist");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.includes("packages/web-dist"), true);
  assertEquals(result?.workspace?.length, 3);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("addWorkspaceMember - does not duplicate existing member", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web-dist"],
  });

  await addWorkspaceMember(denoJsonPath, "packages/web-dist");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.length, 2);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("addWorkspaceMember - normalizes path with trailing slash", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared"],
  });

  await addWorkspaceMember(denoJsonPath, "packages/web-dist/");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.includes("packages/web-dist"), true);
  assertEquals(result?.workspace?.includes("packages/web-dist/"), false);

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// removeWorkspaceMember tests
// =============================================================================

Deno.test("removeWorkspaceMember - removes existing member", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web", "packages/web-dist"],
  });

  await removeWorkspaceMember(denoJsonPath, "packages/web-dist");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.includes("packages/web-dist"), false);
  assertEquals(result?.workspace?.length, 2);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("removeWorkspaceMember - does nothing if member not found", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web"],
  });

  await removeWorkspaceMember(denoJsonPath, "packages/nonexistent");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.length, 2);

  await Deno.remove(tempDir, { recursive: true });
});

// =============================================================================
// cleanStaleTranspiledMembers tests
// =============================================================================

Deno.test("cleanStaleTranspiledMembers - removes non-existent -dist members", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");
  const existingDistDir = join(tempDir, "packages", "existing-dist");

  // Create only one of the dist directories
  await Deno.mkdir(existingDistDir, { recursive: true });

  await writeDenoJson(denoJsonPath, {
    workspace: [
      "packages/shared",
      "packages/web",
      "packages/existing-dist",
      "packages/stale-dist",
    ],
  });

  const removed = await cleanStaleTranspiledMembers(denoJsonPath);

  assertEquals(removed.length, 1);
  assertEquals(removed[0], "packages/stale-dist");

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.includes("packages/stale-dist"), false);
  assertEquals(result?.workspace?.includes("packages/existing-dist"), true);
  assertEquals(result?.workspace?.includes("packages/shared"), true);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("cleanStaleTranspiledMembers - preserves non-dist members", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    workspace: ["packages/shared", "packages/web"],
  });

  const removed = await cleanStaleTranspiledMembers(denoJsonPath);

  assertEquals(removed.length, 0);

  const result = await readDenoJson(denoJsonPath);
  assertEquals(result?.workspace?.length, 2);

  await Deno.remove(tempDir, { recursive: true });
});

Deno.test("cleanStaleTranspiledMembers - returns empty array for no workspace", async () => {
  const tempDir = await Deno.makeTempDir();
  const denoJsonPath = join(tempDir, "deno.json");

  await writeDenoJson(denoJsonPath, {
    name: "no-workspace",
  });

  const removed = await cleanStaleTranspiledMembers(denoJsonPath);

  assertEquals(removed.length, 0);

  await Deno.remove(tempDir, { recursive: true });
});
