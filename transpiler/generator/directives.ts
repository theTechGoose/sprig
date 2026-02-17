/**
 * Generate wrapper functions for custom directives
 */

import { join, relative, dirname } from "@std/path";
import type { SprigDirective } from "../parser/mod.ts";
import { getDirectiveName } from "../parser/directive.ts";

export interface GeneratedDirective {
  /** Output path relative to dist/ */
  outputPath: string;
  /** Generated TypeScript content */
  content: string;
}

/**
 * Generate a wrapper function for a custom directive
 *
 * @example
 * // Input: @Directive({ selector: '*highlight' })
 * // Output:
 * // import { HighlightDirective } from "@/src/directives/highlight.directive.ts";
 * // const _instance = new HighlightDirective();
 * // export function applyHighlightDirective(props, value) { ... }
 */
export function generateDirective(
  directive: SprigDirective,
  srcDir: string,
): GeneratedDirective {
  const selector = getDirectiveName(directive.metadata.selector);
  const className = directive.metadata.className;

  // Calculate import path from dist/directives to src/directives
  const relativeSourcePath = relative(srcDir, directive.path);
  const importPath = `@/src/${relativeSourcePath}`;

  const content = `/**
 * Generated wrapper for ${className}
 * Source: ${relativeSourcePath}
 */

import { ${className} } from "${importPath}";

const _${selector}Instance = new ${className}();

/**
 * Apply ${selector} directive to element props
 * @param props - Current element props
 * @param value - Directive expression value
 * @returns Modified props with directive effects applied
 */
export function apply${className}(
  props: Record<string, unknown>,
  value: unknown,
): Record<string, unknown> {
  const result = _${selector}Instance.transform(null, value);
  return { ...props, ...result };
}
`;

  const outputPath = `directives/${selector}.ts`;

  return { outputPath, content };
}

/**
 * Write all directive wrapper files to disk
 */
export async function writeDirectives(
  directives: SprigDirective[],
  srcDir: string,
  outDir: string,
): Promise<void> {
  if (directives.length === 0) {
    return;
  }

  const directivesDir = join(outDir, "directives");
  await Deno.mkdir(directivesDir, { recursive: true });

  for (const directive of directives) {
    const { outputPath, content } = generateDirective(directive, srcDir);
    const fullPath = join(outDir, outputPath);

    await Deno.writeTextFile(fullPath, content);
  }
}

/**
 * Generate index file for directives
 */
export function generateDirectivesIndex(directives: SprigDirective[]): string {
  if (directives.length === 0) {
    return "// No custom directives\nexport {};\n";
  }

  const exports: string[] = [];

  for (const directive of directives) {
    const selector = getDirectiveName(directive.metadata.selector);
    const className = directive.metadata.className;
    exports.push(`export { apply${className} } from "./${selector}.ts";`);
  }

  return exports.join("\n") + "\n";
}

/**
 * Write directives index file
 */
export async function writeDirectivesIndex(
  directives: SprigDirective[],
  outDir: string,
): Promise<void> {
  const indexContent = generateDirectivesIndex(directives);
  const indexPath = join(outDir, "directives", "mod.ts");

  const directivesDir = join(outDir, "directives");
  await Deno.mkdir(directivesDir, { recursive: true });

  await Deno.writeTextFile(indexPath, indexContent);
}
