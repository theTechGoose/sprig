/**
 * Generate wrapper functions for custom pipes
 */

import { join, relative } from "@std/path";
import type { SprigPipe } from "../parser/mod.ts";

export interface GeneratedPipe {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Generated TypeScript content */
  content: string;
}

/**
 * Generate a wrapper function for a custom pipe
 *
 * @example
 * // Input: @Pipe({ name: 'reverse' })
 * // Output:
 * // import { ReversePipe } from "@/src/pipes/reverse.pipe.ts";
 * // const _instance = new ReversePipe();
 * // export function reverse(value, ...args) { return _instance.transform(value, ...args); }
 */
export function generatePipe(
  pipe: SprigPipe,
  srcDir: string,
): GeneratedPipe {
  const name = pipe.metadata.name;
  const className = pipe.metadata.className;

  // Calculate import path from dist/pipes to src/pipes
  const relativeSourcePath = relative(srcDir, pipe.path);
  const importPath = `@/src/${relativeSourcePath}`;

  const content = `/**
 * Generated wrapper for ${className}
 * Source: ${relativeSourcePath}
 * Pure: ${pipe.metadata.pure}
 */

import { ${className} } from "${importPath}";

const _${name}Instance = new ${className}();

/**
 * ${name} pipe function
 * Wrapper for ${className}.transform()
 */
export function ${name}(value: unknown, ...args: unknown[]): unknown {
  return _${name}Instance.transform(value, ...args);
}
`;

  const outputPath = `pipes/${name}.ts`;

  return { outputPath, content };
}

/**
 * Write all pipe wrapper files to disk
 */
export async function writePipes(
  pipes: SprigPipe[],
  srcDir: string,
  outDir: string,
): Promise<void> {
  if (pipes.length === 0) {
    return;
  }

  const pipesDir = join(outDir, "pipes");
  await Deno.mkdir(pipesDir, { recursive: true });

  for (const pipe of pipes) {
    const { outputPath, content } = generatePipe(pipe, srcDir);
    const fullPath = join(outDir, outputPath);

    await Deno.writeTextFile(fullPath, content);
  }
}

/**
 * Generate index file for pipes
 */
export function generatePipesIndex(pipes: SprigPipe[]): string {
  if (pipes.length === 0) {
    return "// No custom pipes\nexport {};\n";
  }

  const exports: string[] = [];

  for (const pipe of pipes) {
    const name = pipe.metadata.name;
    exports.push(`export { ${name} } from "./${name}.ts";`);
  }

  return exports.join("\n") + "\n";
}

/**
 * Write pipes index file
 */
export async function writePipesIndex(
  pipes: SprigPipe[],
  outDir: string,
): Promise<void> {
  const indexContent = generatePipesIndex(pipes);
  const indexPath = join(outDir, "pipes", "mod.ts");

  const pipesDir = join(outDir, "pipes");
  await Deno.mkdir(pipesDir, { recursive: true });

  await Deno.writeTextFile(indexPath, indexContent);
}
