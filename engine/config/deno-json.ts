/**
 * deno.json reading, parsing, and merging utilities
 *
 * Handles reading source deno.json files and merging imports
 * with Fresh boilerplate defaults.
 */

export interface DenoJson {
  name?: string;
  version?: string;
  exports?: string;
  imports?: Record<string, string>;
  tasks?: Record<string, string>;
  compilerOptions?: Record<string, unknown>;
  workspace?: string[];
  nodeModulesDir?: string;
}

/**
 * Read and parse a deno.json file
 *
 * @param path - Path to deno.json file
 * @returns Parsed deno.json or null if not found/invalid
 */
export async function readDenoJson(path: string): Promise<DenoJson | null> {
  try {
    const content = await Deno.readTextFile(path);
    return JSON.parse(content) as DenoJson;
  } catch {
    return null;
  }
}

/**
 * Write a deno.json file
 *
 * @param path - Path to write deno.json
 * @param config - DenoJson object to write
 */
export async function writeDenoJson(
  path: string,
  config: DenoJson
): Promise<void> {
  const content = JSON.stringify(config, null, 2) + "\n";
  await Deno.writeTextFile(path, content);
}

/**
 * Fresh boilerplate imports - these are the base imports needed for
 * a Fresh 2 application to function
 */
export function getFreshBoilerplateImports(): Record<string, string> {
  return {
    "@/": "./",
    "fresh": "jsr:@fresh/core@^2.2.0",
    "preact": "npm:preact@^10.27.2",
    "@preact/signals": "npm:@preact/signals@^2.5.0",
    "@fresh/plugin-vite": "jsr:@fresh/plugin-vite@^1.0.8",
    "vite": "npm:vite@^7.1.3",
    "tsyringe": "npm:tsyringe@^4.8.0",
    "reflect-metadata": "npm:reflect-metadata@^0.2.2",
  };
}

/**
 * Merge source imports with Fresh boilerplate imports.
 * Source imports win on conflict.
 *
 * @param sourceImports - Imports from source deno.json
 * @param freshImports - Fresh boilerplate imports
 * @returns Merged imports object with source taking precedence
 */
export function mergeImports(
  sourceImports: Record<string, string>,
  freshImports: Record<string, string>
): Record<string, string> {
  return {
    ...freshImports,
    ...sourceImports,
  };
}

/**
 * Generate the complete deno.json configuration for the dist folder.
 * Merges source imports with Fresh boilerplate and generates appropriate
 * tasks and compiler options.
 *
 * @param sourceDenoJson - The source project's deno.json (or null if not found)
 * @returns Complete deno.json as a JSON string
 */
export function generateDistDenoJson(
  sourceDenoJson: DenoJson | null
): string {
  const freshImports = getFreshBoilerplateImports();
  const sourceImports = sourceDenoJson?.imports ?? {};

  const mergedImports = mergeImports(sourceImports, freshImports);

  const distConfig: DenoJson = {
    tasks: {
      dev: "vite",
      build: "vite build",
      start: "deno serve -A _fresh/server.js",
    },
    imports: mergedImports,
    compilerOptions: {
      lib: ["dom", "dom.asynciterable", "dom.iterable", "deno.ns"],
      jsx: "precompile",
      jsxImportSource: "preact",
      jsxPrecompileSkipElements: [
        "a",
        "img",
        "source",
        "body",
        "html",
        "head",
        "title",
        "meta",
        "script",
        "link",
        "style",
        "base",
        "noscript",
        "template",
      ],
      types: ["vite/client"],
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  };

  return JSON.stringify(distConfig, null, 2) + "\n";
}

/**
 * Generate the complete DenoJson object for the dist folder.
 * Same as generateDistDenoJson but returns the object instead of string.
 *
 * @param sourceDenoJson - The source project's deno.json (or null if not found)
 * @returns Complete DenoJson configuration object
 */
export function generateDistDenoJsonConfig(
  sourceDenoJson: DenoJson | null
): DenoJson {
  const freshImports = getFreshBoilerplateImports();
  const sourceImports = sourceDenoJson?.imports ?? {};

  const mergedImports = mergeImports(sourceImports, freshImports);

  return {
    nodeModulesDir: "manual",
    tasks: {
      dev: "vite",
      build: "vite build",
      start: "deno serve -A _fresh/server.js",
    },
    imports: mergedImports,
    compilerOptions: {
      lib: ["dom", "dom.asynciterable", "dom.iterable", "deno.ns"],
      jsx: "precompile",
      jsxImportSource: "preact",
      jsxPrecompileSkipElements: [
        "a",
        "img",
        "source",
        "body",
        "html",
        "head",
        "title",
        "meta",
        "script",
        "link",
        "style",
        "base",
        "noscript",
        "template",
      ],
      types: ["vite/client"],
      experimentalDecorators: true,
      emitDecoratorMetadata: true,
    },
  };
}
