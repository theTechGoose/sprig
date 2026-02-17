/**
 * Transpilation wrapper
 */

import { join } from "@std/path";
import { exists } from "@std/fs";
import { findProjectRoot, getOutputDir } from "./project.ts";

export interface TranspileOptions {
  clean?: boolean;
  projectPath?: string;
}

export interface TranspileResult {
  projectRoot: string;
  outputDir: string;
  entryPoint: string;
}

/**
 * Transpile a Sprig project.
 *
 * Finds the nearest deno.json, transpiles the project,
 * and returns paths to the output.
 */
export async function transpile(options: TranspileOptions = {}): Promise<TranspileResult> {
  const projectRoot = await findProjectRoot(options.projectPath);
  const outputDir = getOutputDir(projectRoot);
  const entryPoint = join(outputDir, "main.ts");

  console.log(`Transpiling Sprig app...`);
  console.log(`  Project: ${projectRoot}`);
  console.log(`  Output:  ${outputDir}`);

  // Import and run the engine
  // We dynamically import to avoid circular dependency issues
  // and to allow the engine to be updated independently
  const enginePath = join(import.meta.dirname!, "../../engine/mod.ts");

  if (await exists(enginePath)) {
    // Local development: use local engine
    const engine = await import(enginePath);
    await engine.transpile(projectRoot, {
      clean: options.clean,
      outputDir, // Pass the output dir override
    });
  } else {
    // Published: spawn deno to run transpilation
    // This is a fallback - ideally the engine exports a proper API
    const process = new Deno.Command("deno", {
      args: [
        "run",
        "-A",
        "jsr:@sprig/engine",
        projectRoot,
        ...(options.clean ? ["--clean"] : []),
      ],
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const status = await process.spawn().status;
    if (!status.success) {
      throw new Error(`Transpilation failed with code ${status.code}`);
    }
  }

  return {
    projectRoot,
    outputDir,
    entryPoint,
  };
}
