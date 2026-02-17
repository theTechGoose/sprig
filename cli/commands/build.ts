/**
 * Build command - transpile only
 */

import { Command } from "@cliffy/command";
import { transpile } from "../lib/transpile.ts";
import { withCleanup } from "../lib/cleanup.ts";

export const buildCommand = new Command()
  .description("Transpile Sprig app to Fresh (no serve)")
  .arguments("[path:string]")
  .option("--clean", "Force clean rebuild")
  .action(async (options, path?: string) => {
    await withCleanup(
      () => {
        // Cleanup: nothing special needed for build
      },
      async () => {
        const result = await transpile({
          projectPath: path,
          clean: options.clean,
        });

        console.log(`\nBuild complete!`);
        console.log(`Output: ${result.outputDir}`);
      }
    );
  });
