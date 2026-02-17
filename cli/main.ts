/**
 * Sprig CLI Main Entry Point
 *
 * Provides the command-line interface for transpiling Sprig apps to Deno Fresh.
 */

import { resolve } from "jsr:@std/path@^1";
import { exists } from "jsr:@std/fs@^1";

// Re-export from engine for programmatic use
export { transpile } from "@sprig/engine";

export async function main() {
  const args = Deno.args;

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printUsage();
    Deno.exit(args.length === 0 ? 1 : 0);
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log("sprig v0.1.0");
    Deno.exit(0);
  }

  const inputPath = resolve(args[0]);

  // Validate input path exists
  if (!await exists(inputPath)) {
    console.error(`Error: Path does not exist: ${inputPath}`);
    Deno.exit(1);
  }

  // Import and run the transpiler
  const { transpile } = await import("@sprig/engine");

  const options = {
    dev: args.includes("--dev"),
    watch: args.includes("--watch"),
    clean: args.includes("--clean"),
    prod: args.includes("--prod"),
  };

  try {
    await transpile(inputPath, options);
  } catch (err) {
    console.error("Transpilation failed:", err);
    Deno.exit(1);
  }
}

function printUsage() {
  console.log(`
Sprig - Angular-like templates for Deno Fresh

USAGE:
  sprig <path> [options]

ARGUMENTS:
  <path>    Path to the Sprig app directory

OPTIONS:
  --dev     Generate dev routes for component testing
  --watch   Incremental build (keep boilerplate, update src only)
  --clean   Force clean rebuild
  --prod    Copy static assets (default: symlink for faster dev)
  --help    Show this help message
  --version Show version

EXAMPLES:
  sprig ./my-app
  sprig ./my-app --dev --watch
  sprig ./my-app --prod --clean
`);
}
