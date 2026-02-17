#!/usr/bin/env -S deno run -A
/**
 * Sprig CLI
 *
 * Angular-like templates for Deno Fresh.
 */

import { Command } from "@cliffy/command";
import { buildCommand } from "./commands/build.ts";
import { serveCommand } from "./commands/serve.ts";

await new Command()
  .name("sprig")
  .version("0.1.0")
  .description("Angular-like templates for Deno Fresh")
  .command("build", buildCommand)
  .command("serve", serveCommand)
  .default("serve")
  .parse(Deno.args);
