/**
 * Serve command - transpile + deno run with full passthrough
 */

import { Command } from "@cliffy/command";
import { transpile } from "../lib/transpile.ts";
import { withCleanup } from "../lib/cleanup.ts";

export const serveCommand = new Command()
  .description("Transpile and serve Fresh app")
  .arguments("[path:string] [...args:string]")
  .option("--clean", "Force clean rebuild before serving")
  .stopEarly() // Stop parsing after path, pass remaining args through
  .action(async (options, path?: string, ...args: string[]) => {
    await withCleanup(
      () => {
        // Cleanup will be handled by signal handlers
      },
      async () => {
        // 1. Transpile
        const result = await transpile({
          projectPath: path,
          clean: options.clean,
        });

        console.log(`\nStarting Fresh server...`);

        // 2. Build deno run args - all remaining args pass through
        const denoArgs = [
          "run",
          ...args,
          result.entryPoint,
        ];

        console.log(`$ deno ${denoArgs.join(" ")}`);

        const process = new Deno.Command("deno", {
          args: denoArgs,
          cwd: result.outputDir,
          stdin: "inherit",
          stdout: "inherit",
          stderr: "inherit",
        });

        const child = process.spawn();
        const status = await child.status;
        Deno.exit(status.code);
      }
    );
  });
