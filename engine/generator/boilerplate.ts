/**
 * Generate Fresh 2 boilerplate files
 */

import { join } from "@std/path";
import {
  type DenoJson,
  generateDistDenoJson,
} from "../config/deno-json.ts";

export interface BoilerplateFiles {
  "deno.json": string;
  "main.ts": string;
  "client.ts": string;
  "utils.ts": string;
  "vite.config.ts": string;
  "routes/_app.tsx": string;
}

/**
 * Generate boilerplate files with optional source deno.json for import merging.
 *
 * @param sourceDenoJson - Source project's deno.json for import merging (optional)
 */
export function generateBoilerplate(
  sourceDenoJson?: DenoJson | null
): BoilerplateFiles {
  return {
    "deno.json": generateDistDenoJson(sourceDenoJson ?? null),
    "main.ts": generateMainTs(),
    "client.ts": generateClientTs(),
    "utils.ts": generateUtilsTs(),
    "vite.config.ts": generateViteConfig(),
    "routes/_app.tsx": generateAppTsx(),
  };
}

function generateMainTs(): string {
  return `import { App, staticFiles } from "fresh";
import { define } from "./utils.ts";

export const app = new App();

app.use(staticFiles());

app.fsRoutes();
`;
}

function generateClientTs(): string {
  return `// Import CSS files here for hot module reloading to work.
import "./styles.css";
`;
}

function generateUtilsTs(): string {
  return `import { createDefine } from "fresh";
import { signal } from "@preact/signals";

export interface State {}

export const define = createDefine<State>();

// Async pipe - unwraps promises reactively
const promiseCache = new WeakMap<Promise<unknown>, ReturnType<typeof signal>>();

export function asyncPipe<T>(value: Promise<T> | T): T | undefined {
  if (!(value instanceof Promise)) {
    return value;
  }

  let sig = promiseCache.get(value);
  if (!sig) {
    sig = signal<T | undefined>(undefined);
    promiseCache.set(value, sig);
    value.then((resolved) => { sig!.value = resolved; });
  }

  return sig.value as T | undefined;
}
`;
}

function generateViteConfig(): string {
  return `import { defineConfig } from "vite";
import { fresh } from "@fresh/plugin-vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [fresh(), tailwindcss()],
  server: {
    force: true,  // Force dependency re-optimization on every start
  },
  optimizeDeps: {
    force: true,  // Disable dependency caching
  },
});
`;
}

function generateAppTsx(): string {
  return `import { define } from "../utils.ts";

export default define.page(function App({ Component }) {
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Fresh App</title>
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
});
`;
}

/**
 * Write boilerplate files to the output directory.
 *
 * @param outDir - Output directory path
 * @param sourceDenoJson - Source project's deno.json for import merging (optional)
 */
export async function writeBoilerplate(
  outDir: string,
  sourceDenoJson?: DenoJson | null
): Promise<void> {
  const files = generateBoilerplate(sourceDenoJson);

  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(outDir, relativePath);
    const dir = fullPath.replace(/[/\\][^/\\]+$/, "");

    await Deno.mkdir(dir, { recursive: true });
    await Deno.writeTextFile(fullPath, content);
  }

  // Create static directory
  await Deno.mkdir(join(outDir, "static"), { recursive: true });
}
