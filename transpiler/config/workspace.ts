/**
 * Git root discovery and workspace management utilities
 *
 * Handles finding the git root, workspace deno.json,
 * and managing workspace members for monorepo support.
 */

import { join, dirname, basename, relative } from "@std/path";
import { exists } from "@std/fs";
import { readDenoJson, writeDenoJson, type DenoJson } from "./deno-json.ts";

/**
 * Walk up from a directory to find the git root (.git folder)
 *
 * @param startDir - Directory to start searching from
 * @returns Path to git root, or null if not found
 */
export async function findGitRoot(startDir: string): Promise<string | null> {
  let currentDir = startDir;

  while (true) {
    const gitDir = join(currentDir, ".git");
    if (await exists(gitDir)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Find workspace deno.json by walking up from startDir.
 * Returns the first deno.json that has a "workspace" field.
 *
 * @param startDir - Directory to start searching from
 * @returns Path to workspace deno.json, or null if not found or not a workspace
 */
export async function findWorkspaceDenoJson(
  startDir: string
): Promise<string | null> {
  let currentDir = startDir;

  while (true) {
    const denoJsonPath = join(currentDir, "deno.json");
    if (await exists(denoJsonPath)) {
      const denoJson = await readDenoJson(denoJsonPath);
      if (denoJson?.workspace) {
        return denoJsonPath;
      }
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root
      return null;
    }
    currentDir = parentDir;
  }
}

/**
 * Get the output directory path (sibling with -dist suffix)
 *
 * Examples:
 * - packages/web/ → packages/web-dist/
 * - my-app/ → my-app-dist/
 *
 * @param sourceDir - Source directory path
 * @returns Output directory path with -dist suffix
 */
export function getOutputDir(sourceDir: string): string {
  const baseName = basename(sourceDir);
  const parentDir = dirname(sourceDir);

  // Handle trailing slash
  const cleanBaseName = baseName || basename(parentDir);
  const cleanParentDir = baseName ? parentDir : dirname(parentDir);

  return join(cleanParentDir, `${cleanBaseName}-dist`);
}

/**
 * Add a member to workspace array in deno.json.
 * Does nothing if member already exists.
 *
 * @param workspaceJsonPath - Path to workspace deno.json
 * @param memberPath - Relative path to add (e.g., "packages/web-dist")
 */
export async function addWorkspaceMember(
  workspaceJsonPath: string,
  memberPath: string
): Promise<void> {
  const denoJson = await readDenoJson(workspaceJsonPath);
  if (!denoJson || !denoJson.workspace) {
    return;
  }

  // Normalize path (remove trailing slashes)
  const normalizedPath = memberPath.replace(/\/+$/, "");

  // Check if already exists
  if (denoJson.workspace.includes(normalizedPath)) {
    return;
  }

  denoJson.workspace.push(normalizedPath);
  await writeDenoJson(workspaceJsonPath, denoJson);
}

/**
 * Remove a member from workspace array in deno.json.
 * Does nothing if member doesn't exist.
 *
 * @param workspaceJsonPath - Path to workspace deno.json
 * @param memberPath - Relative path to remove (e.g., "packages/web-dist")
 */
export async function removeWorkspaceMember(
  workspaceJsonPath: string,
  memberPath: string
): Promise<void> {
  const denoJson = await readDenoJson(workspaceJsonPath);
  if (!denoJson || !denoJson.workspace) {
    return;
  }

  // Normalize path (remove trailing slashes)
  const normalizedPath = memberPath.replace(/\/+$/, "");

  const index = denoJson.workspace.indexOf(normalizedPath);
  if (index === -1) {
    return;
  }

  denoJson.workspace.splice(index, 1);
  await writeDenoJson(workspaceJsonPath, denoJson);
}

/**
 * Remove all stale transpiled members (matching *-dist pattern) from workspace.
 * Only removes members where the -dist folder no longer exists on disk.
 *
 * @param workspaceJsonPath - Path to workspace deno.json
 * @returns Array of removed member paths
 */
export async function cleanStaleTranspiledMembers(
  workspaceJsonPath: string
): Promise<string[]> {
  const denoJson = await readDenoJson(workspaceJsonPath);
  if (!denoJson || !denoJson.workspace) {
    return [];
  }

  const gitRoot = dirname(workspaceJsonPath);
  const removedMembers: string[] = [];
  const cleanedWorkspace: string[] = [];

  for (const member of denoJson.workspace) {
    // Check if this is a -dist member
    if (member.endsWith("-dist")) {
      const memberPath = join(gitRoot, member);
      const memberExists = await exists(memberPath);

      if (!memberExists) {
        // Stale member - don't include in cleaned workspace
        removedMembers.push(member);
        continue;
      }
    }

    cleanedWorkspace.push(member);
  }

  if (removedMembers.length > 0) {
    denoJson.workspace = cleanedWorkspace;
    await writeDenoJson(workspaceJsonPath, denoJson);
  }

  return removedMembers;
}

/**
 * Get the relative path from git root to a directory.
 *
 * @param gitRoot - Git root directory path
 * @param targetDir - Target directory path
 * @returns Relative path from git root to target
 */
export function getRelativePathFromGitRoot(
  gitRoot: string,
  targetDir: string
): string {
  return relative(gitRoot, targetDir);
}

/**
 * Check if a source folder name already ends with -dist.
 * This is an edge case that should be warned about.
 *
 * @param sourceDir - Source directory path
 * @returns true if folder name ends with -dist
 */
export function isDistFolder(sourceDir: string): boolean {
  const baseName = basename(sourceDir) || basename(dirname(sourceDir));
  return baseName.endsWith("-dist");
}
