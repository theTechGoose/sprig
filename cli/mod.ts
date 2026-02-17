/**
 * Sprig CLI
 *
 * Command-line interface for the Sprig transpiler.
 *
 * Usage: deno run -A mod.ts <sprig-app-path> [options]
 */

export { main } from "./main.ts";

// Run CLI when executed directly
if (import.meta.main) {
  const { main } = await import("./main.ts");
  main();
}
