/**
 * Project discovery utilities
 */

import { dirname, join, resolve } from "@std/path";
import { exists } from "@std/fs";

/**
 * Find the nearest deno.json starting from the given directory and walking up.
 * Returns the directory containing deno.json (project root).
 */
export async function findProjectRoot(startDir: string = Deno.cwd()): Promise<string> {
  let currentDir = resolve(startDir);

  while (true) {
    const denoJsonPath = join(currentDir, "deno.json");
    if (await exists(denoJsonPath)) {
      return currentDir;
    }

    const parentDir = dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached filesystem root without finding deno.json
      throw new Error(
        `No deno.json found. Run this command from a Sprig project directory.`
      );
    }
    currentDir = parentDir;
  }
}

/**
 * Get the output directory for a project.
 * Output goes to __sprig__/<project-name>/ inside the project.
 */
export function getOutputDir(projectRoot: string): string {
  const projectName = projectRoot.split("/").pop() || "app";
  return join(projectRoot, "__sprig__", projectName);
}

/**
 * Get the main entry point for the transpiled Fresh app.
 */
export function getEntryPoint(outputDir: string): string {
  return join(outputDir, "main.ts");
}
