# Sprig CLI Plan

## Overview

Refactor the CLI to use [Cliffy](https://cliffy.io/) and change the output directory structure from `<proj>-dist` to `__sprig__/<proj>`.

## Current State

### Output Directory Logic (engine/config/workspace.ts)
```
getOutputDir("/path/to/web") → "/path/to/web-dist"
```

### Current Flow
1. User runs `deno run -A engine/mod.ts ./my-app`
2. Engine transpiles `./my-app/src/` → `./my-app-dist/`
3. User manually runs `cd my-app-dist && deno task dev`

## Proposed State

### New Output Directory Logic
```
getOutputDir("/path/to/web") → "/path/to/__sprig__/web"
```

The `__sprig__` folder sits inside the project, keeping artifacts contained:
```
my-app/
├── src/                    # Source (Sprig templates)
├── __sprig__/              # Generated (gitignored)
│   └── my-app/             # Fresh app output
│       ├── routes/
│       ├── islands/
│       ├── components/
│       └── deno.json
├── deno.json
└── .gitignore              # Contains __sprig__/
```

### New CLI Commands

```bash
sprig build [path]          # Transpile only
sprig serve [path]          # Transpile + run Fresh dev server
sprig serve --prod [path]   # Transpile + run Fresh production
```

## Implementation Plan

### Phase 1: CLI Structure with Cliffy

**File: cli/mod.ts**
```typescript
import { Command } from "jsr:@cliffy/command@1";
import { build } from "./commands/build.ts";
import { serve } from "./commands/serve.ts";

await new Command()
  .name("sprig")
  .version("0.1.0")
  .description("Angular-like templates for Deno Fresh")
  .command("build", build)
  .command("serve", serve)
  .parse(Deno.args);
```

**File: cli/commands/build.ts**
```typescript
import { Command } from "jsr:@cliffy/command@1";
import { transpile } from "@sprig/engine";

export const build = new Command()
  .description("Transpile Sprig app to Fresh")
  .arguments("[path:string]")
  .option("--clean", "Force clean rebuild")
  .option("--dev", "Generate dev routes")
  .action(async (options, path = ".") => {
    await runWithCleanup(async () => {
      await transpile(path, {
        clean: options.clean,
        dev: options.dev,
      });
    });
  });
```

**File: cli/commands/serve.ts**
```typescript
import { Command } from "jsr:@cliffy/command@1";
import { transpile, getOutputDir } from "@sprig/engine";

export const serve = new Command()
  .description("Transpile and serve Fresh app")
  .arguments("[path:string]")
  .option("--prod", "Run in production mode")
  .option("--port <port:number>", "Port to serve on", { default: 8000 })
  .option("--watch", "Watch for changes and rebuild")
  .action(async (options, path = ".") => {
    await runWithCleanup(async () => {
      // 1. Transpile
      await transpile(path, {
        watch: options.watch,
        prod: options.prod,
      });

      // 2. Run Fresh (passthrough to deno task)
      const outDir = getOutputDir(path);
      const cmd = options.prod ? "start" : "dev";

      const process = new Deno.Command("deno", {
        args: ["task", cmd],
        cwd: outDir,
        stdin: "inherit",
        stdout: "inherit",
        stderr: "inherit",
      });

      await process.output();
    });
  });
```

### Phase 2: Cleanup Logic

**File: cli/lib/cleanup.ts**
```typescript
import { getSprigDir } from "@sprig/engine";

let cleanupRegistered = false;

export async function runWithCleanup<T>(fn: () => Promise<T>): Promise<T> {
  if (!cleanupRegistered) {
    // Register signal handlers
    Deno.addSignalListener("SIGINT", cleanup);
    Deno.addSignalListener("SIGTERM", cleanup);
    cleanupRegistered = true;
  }

  try {
    return await fn();
  } finally {
    await cleanup();
  }
}

async function cleanup(): Promise<void> {
  // Remove workspace member registration
  // (engine handles this internally via removeWorkspaceMember)
  console.log("\nCleaning up...");
}
```

### Phase 3: Engine Modifications

**File: engine/config/workspace.ts**

Change `getOutputDir`:
```typescript
// Before
export function getOutputDir(sourceDir: string): string {
  const baseName = basename(sourceDir);
  const parentDir = dirname(sourceDir);
  return join(parentDir, `${baseName}-dist`);
}

// After
export function getOutputDir(sourceDir: string): string {
  const baseName = basename(sourceDir);
  return join(sourceDir, "__sprig__", baseName);
}
```

Update stale member detection:
```typescript
// Before: checks for *-dist pattern
if (member.endsWith("-dist")) { ... }

// After: checks for __sprig__ pattern
if (member.includes("__sprig__")) { ... }
```

**File: engine/mod.ts**

Update edge case check:
```typescript
// Before
if (isDistFolder(inputPath)) {
  console.error(`Warning: Source folder already ends with -dist.`);
}

// After
if (isSprigOutputFolder(inputPath)) {
  console.error(`Warning: Cannot transpile __sprig__ folder.`);
  Deno.exit(1);
}
```

### Phase 4: Passthrough Commands

The `serve` command needs to pass through Deno's features:
- `--watch` → Deno's watch mode
- `--port` → Fresh's port config
- Ctrl+C handling → cleanup + exit

**Implementation:**
```typescript
// In serve command
const denoArgs = ["task", options.prod ? "start" : "dev"];

// Pass through any additional args after --
if (options["--"]) {
  denoArgs.push(...options["--"]);
}

const process = new Deno.Command("deno", {
  args: denoArgs,
  cwd: outDir,
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
  env: {
    PORT: String(options.port),
  },
});
```

### Phase 5: .gitignore Integration

On first `sprig build`, check/update `.gitignore`:
```typescript
async function ensureGitignore(projectDir: string): Promise<void> {
  const gitignorePath = join(projectDir, ".gitignore");
  const sprigEntry = "__sprig__/";

  let content = "";
  try {
    content = await Deno.readTextFile(gitignorePath);
  } catch {
    // No .gitignore exists
  }

  if (!content.includes(sprigEntry)) {
    content += `\n# Sprig build output\n${sprigEntry}\n`;
    await Deno.writeTextFile(gitignorePath, content);
    console.log("Added __sprig__/ to .gitignore");
  }
}
```

## Files to Modify

### Engine (engine/)
| File | Changes |
|------|---------|
| `config/workspace.ts` | Change `getOutputDir` to use `__sprig__/<name>` pattern |
| `config/workspace.ts` | Update `cleanStaleTranspiledMembers` to detect `__sprig__` |
| `config/workspace.ts` | Add `isSprigOutputFolder` check |
| `mod.ts` | Update edge case handling |
| `tests/workspace_test.ts` | Update tests for new output pattern |

### CLI (cli/)
| File | Action |
|------|--------|
| `mod.ts` | Rewrite with Cliffy command structure |
| `main.ts` | Remove (merged into mod.ts) |
| `commands/build.ts` | New - build command |
| `commands/serve.ts` | New - serve command |
| `lib/cleanup.ts` | New - cleanup utilities |
| `lib/gitignore.ts` | New - .gitignore management |
| `deno.json` | Add Cliffy dependency |

## CLI Usage Examples

```bash
# Basic build
sprig build

# Build specific project
sprig build ./my-app

# Build with dev routes
sprig build --dev

# Serve with hot reload
sprig serve

# Serve in production mode
sprig serve --prod

# Serve on custom port
sprig serve --port 3000

# Pass additional args to Deno
sprig serve -- --inspect
```

## Migration Notes

1. Existing `*-dist` folders will not be automatically migrated
2. Users should manually delete old `*-dist` folders
3. Workspace `deno.json` entries with `-dist` pattern should be removed
4. Add `__sprig__/` to root `.gitignore`

## Dependencies

```json
{
  "imports": {
    "@cliffy/command": "jsr:@cliffy/command@^1",
    "@sprig/engine": "jsr:@sprig/engine@^0.1.0",
    "@std/path": "jsr:@std/path@^1",
    "@std/fs": "jsr:@std/fs@^1"
  }
}
```
