/**
 * Sprig Engine
 *
 * Core transpilation engine for converting Sprig apps to Deno Fresh.
 * Use @sprig/cli for the command-line interface.
 *
 * @module
 */

import { join, resolve, dirname, basename, relative } from "@std/path";
import { exists } from "@std/fs";
import { scanSprigApp } from "./parser/mod.ts";
import {
  writeBoilerplate,
  writeIslands,
  writeComponents,
  writeBootstrapLayout,
  writeRoutes,
  writeServices,
  writeServicesIndex,
  writeDirectives,
  writeDirectivesIndex,
  writePipes,
  writePipesIndex,
  writeDevRoutes,
  writeComponentStyles,
  copyStaticAssets,
} from "./generator/mod.ts";
import { devConfig, type TranspilerConfig } from "./config/transpiler-config.ts";
import { directiveRegistry, pipeRegistry } from "./transformer/mod.ts";
import { readDenoJson, type DenoJson } from "./config/deno-json.ts";
import {
  findGitRoot,
  findWorkspaceDenoJson,
  getOutputDir,
  addWorkspaceMember,
  removeWorkspaceMember,
  cleanStaleTranspiledMembers,
  isDistFolder,
} from "./config/workspace.ts";

// Track workspace state for cleanup
let workspaceJsonPath: string | null = null;
let relativeOutDir: string | null = null;

/**
 * Transpile options
 */
export interface TranspileOptions {
  /** Generate dev routes for component testing */
  dev?: boolean;
  /** Incremental build mode */
  watch?: boolean;
  /** Force clean rebuild */
  clean?: boolean;
  /** Copy static assets instead of symlinking */
  prod?: boolean;
}

/**
 * Transpile a Sprig app to Deno Fresh
 *
 * @param inputPath - Path to the Sprig app directory
 * @param options - Transpilation options
 */
export async function transpile(
  inputPath: string,
  options: TranspileOptions = {}
): Promise<void> {
  const resolvedPath = resolve(inputPath);
  const args = [];

  if (options.dev) args.push("--dev");
  if (options.watch) args.push("--watch");
  if (options.clean) args.push("--clean");
  if (options.prod) args.push("--prod");

  await runTranspiler(resolvedPath, args);
}

/**
 * Clean up workspace membership on shutdown
 */
async function cleanupWorkspace(): Promise<void> {
  if (workspaceJsonPath && relativeOutDir) {
    try {
      await removeWorkspaceMember(workspaceJsonPath, relativeOutDir);
      console.log(`\nRemoved ${relativeOutDir} from workspace.`);
    } catch {
      // Ignore errors during cleanup
    }
  }
}

/**
 * Setup signal handlers for graceful shutdown
 */
function setupSignalHandlers(): void {
  Deno.addSignalListener("SIGINT", async () => {
    await cleanupWorkspace();
    Deno.exit(0);
  });
}

async function runTranspiler(inputPath: string, flags: string[]) {
  const isWatchMode = flags.includes("--watch");
  const forceClean = flags.includes("--clean");
  const isProdMode = flags.includes("--prod");

  // Validate input path exists
  if (!await exists(inputPath)) {
    console.error(`Error: Path does not exist: ${inputPath}`);
    Deno.exit(1);
  }

  // Check for edge case: source folder already ends with -dist
  if (isDistFolder(inputPath)) {
    console.error(`Warning: Source folder "${basename(inputPath)}" already ends with -dist.`);
    console.error("Output will be named with -dist-dist suffix.");
  }

  // Find deno.json to determine project root and read imports
  let projectRoot = inputPath;
  const denoJsonPath = join(inputPath, "deno.json");
  let sourceDenoJson: DenoJson | null = null;

  if (await exists(denoJsonPath)) {
    projectRoot = inputPath;
    sourceDenoJson = await readDenoJson(denoJsonPath);
  } else {
    console.error(`Warning: No deno.json found at ${denoJsonPath}`);
    console.error("Using input path as project root.");
  }

  // Determine src directory
  const srcDir = join(projectRoot, "src");
  if (!await exists(srcDir)) {
    console.error(`Error: No src/ directory found at ${srcDir}`);
    Deno.exit(1);
  }

  // Output directory is sibling folder with -dist suffix
  const outDir = getOutputDir(projectRoot);

  console.log(`Transpiling Sprig app...`);
  console.log(`  Source: ${srcDir}`);
  console.log(`  Output: ${outDir}`);
  if (isWatchMode) {
    console.log(`  Mode: Incremental (HMR-compatible)`);
  }

  // Find workspace deno.json at git root (if exists)
  const gitRoot = await findGitRoot(projectRoot);
  workspaceJsonPath = gitRoot ? await findWorkspaceDenoJson(projectRoot) : null;

  if (workspaceJsonPath) {
    console.log(`  Workspace: ${workspaceJsonPath}`);
    const workspaceRoot = dirname(workspaceJsonPath);

    // Clean stale transpiled members (*-dist that no longer exist)
    const staleMembers = await cleanStaleTranspiledMembers(workspaceJsonPath);
    if (staleMembers.length > 0) {
      console.log(`  Cleaned ${staleMembers.length} stale workspace member(s)`);
    }

    // Register new -dist folder in workspace (relative to workspace root)
    relativeOutDir = "./" + relative(workspaceRoot, outDir);
    await addWorkspaceMember(workspaceJsonPath, relativeOutDir);
    console.log(`  Registered ${relativeOutDir} in workspace`);
  }

  // Setup signal handlers for graceful shutdown
  setupSignalHandlers();

  // Check if dist exists and has boilerplate
  const boilerplateExists = await exists(join(outDir, "deno.json"));

  // Clean only generated src folders (not boilerplate) in watch mode
  // Full clean on first run or --clean flag
  if (forceClean || !boilerplateExists) {
    try {
      await Deno.remove(outDir, { recursive: true });
    } catch {
      // Directory doesn't exist, that's fine
    }
    await Deno.mkdir(outDir, { recursive: true });
  } else if (isWatchMode) {
    // Incremental: only clean generated folders
    const generatedFolders = ["components", "islands", "routes", "services", "directives", "pipes"];
    for (const folder of generatedFolders) {
      try {
        await Deno.remove(join(outDir, folder), { recursive: true });
      } catch {
        // Folder doesn't exist, that's fine
      }
    }
    // Also clean static/css for styles
    try {
      await Deno.remove(join(outDir, "static/css"), { recursive: true });
    } catch {
      // Folder doesn't exist
    }
  } else {
    // Default: full clean
    try {
      await Deno.remove(outDir, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
    await Deno.mkdir(outDir, { recursive: true });
  }

  // Step 1: Scan the Sprig app
  console.log("\nScanning Sprig app...");
  const scanResult = await scanSprigApp(srcDir);

  console.log(`  Bootstrap: ${scanResult.bootstrapHtmlPath ? "yes" : "no"}`);
  console.log(`  Found ${scanResult.routes.length} route(s)`);
  console.log(`  Found ${scanResult.domainComponents.length} component(s)`);
  console.log(`  Found ${scanResult.services.length} service(s)`);
  console.log(`  Found ${scanResult.directives.length} directive(s)`);
  console.log(`  Found ${scanResult.pipes.length} pipe(s)`);

  // Register custom directives
  for (const directive of scanResult.directives) {
    directiveRegistry.register(directive, outDir);
  }

  // Register custom pipes
  for (const pipe of scanResult.pipes) {
    pipeRegistry.register(pipe, outDir);
  }

  // Step 2: Generate boilerplate with merged imports (skip in watch mode if already exists)
  if (!isWatchMode || !boilerplateExists) {
    console.log("\nGenerating boilerplate...");
    await writeBoilerplate(outDir, sourceDenoJson);
  } else {
    console.log("\nBoilerplate exists, skipping (HMR mode)...");
  }

  // Step 3: Generate services
  console.log("Generating services...");
  await writeServices(scanResult.services, outDir);
  await writeServicesIndex(scanResult.services, outDir);

  // Step 3b: Generate custom directives
  if (scanResult.directives.length > 0) {
    console.log("Generating directives...");
    await writeDirectives(scanResult.directives, srcDir, outDir);
    await writeDirectivesIndex(scanResult.directives, outDir);
  }

  // Step 3c: Generate custom pipes
  if (scanResult.pipes.length > 0) {
    console.log("Generating pipes...");
    await writePipes(scanResult.pipes, srcDir, outDir);
    await writePipesIndex(scanResult.pipes, outDir);
  }

  // Step 4: Compile component styles (SCSS/CSS)
  const componentsWithStyles = scanResult.components.filter(c => c.metadata.styling);
  if (componentsWithStyles.length > 0) {
    console.log("Compiling styles...");
    await writeComponentStyles(scanResult.components, outDir);
  }

  // Step 5: Copy/symlink static assets
  console.log(isProdMode ? "Copying static assets..." : "Symlinking static assets...");
  await copyStaticAssets(projectRoot, outDir, { symlink: !isProdMode });

  // Step 6: Generate islands (interactive components)
  console.log("Generating islands...");
  await writeIslands(scanResult.components, scanResult.components, outDir, scanResult.services);

  // Step 7: Generate regular components
  console.log("Generating components...");
  await writeComponents(scanResult.components, scanResult.components, outDir, scanResult.services);

  // Step 8: Generate layout from bootstrap.html
  if (scanResult.bootstrapHtmlPath) {
    console.log("Generating layout...");
    await writeBootstrapLayout(scanResult.bootstrapHtmlPath, outDir);
  }

  // Step 9: Generate routes
  console.log("Generating routes...");
  await writeRoutes(scanResult.routes, scanResult.components, outDir);

  // Step 10: Generate dev routes (if in dev mode)
  const config: TranspilerConfig = flags.includes("--dev") ? devConfig : { ...devConfig, devMode: false, generateDevRoutes: false };
  if (config.generateDevRoutes) {
    console.log("Generating dev routes...");
    await writeDevRoutes(scanResult.domainComponents, config, outDir);
  }

  console.log("\nTranspilation complete!");
  console.log(`\nTo run the Fresh app:`);
  console.log(`  cd ${outDir}`);
  console.log(`  deno install`);
  console.log(`  deno task dev`);
}

// Run when executed directly (backwards compatibility)
if (import.meta.main) {
  const args = Deno.args;
  if (args.length === 0) {
    console.error("Usage: deno run -A mod.ts <sprig-app-path> [--dev] [--watch] [--clean] [--prod]");
    console.error("\nFor full CLI, use: deno install -A jsr:@sprig/cli");
    Deno.exit(1);
  }
  runTranspiler(resolve(args[0]), args.slice(1)).catch((err) => {
    console.error("Transpilation failed:", err);
    Deno.exit(1);
  });
}
