# Sprig CLI Plan

## Overview

Refactor the CLI to use [Cliffy](https://cliffy.io/) and change the output directory structure from `<proj>-dist` to `__sprig__/<proj>`.

**Core Principle:** The CLI is a thin wrapper that ALWAYS passes through to Deno. Every command follows this pattern:

```
cleanup (before) → transpile → deno <command> [...args] → cleanup (after)
```

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

### CLI Commands (All Passthrough to Deno)

```bash
sprig build [path] [-- ...args]     # transpile → deno task build [...args]
sprig serve [path] [-- ...args]     # transpile → deno task dev [...args]
sprig <any> [path] [-- ...args]     # transpile → deno <any> [...args]
```

Every command:
1. Runs cleanup (before)
2. Transpiles the project
3. Passes through to `deno` with all remaining args
4. Runs cleanup (after / on signal)

## Implementation Plan

### Phase 1: CLI Structure with Cliffy

The CLI intercepts the first argument to determine the command, then passes everything else through to Deno.

**File: cli/mod.ts**
```typescript
import { Command } from "jsr:@cliffy/command@1";
import { runCommand } from "./lib/runner.ts";

await new Command()
  .name("sprig")
  .version("0.1.0")
  .description("Angular-like templates for Deno Fresh")
  .arguments("[command:string] [path:string] [...args:string]")
  .option("--clean", "Force clean rebuild before command")
  .stopEarly() // Stop parsing, pass remaining args through
  .action(async (options, command, path, ...args) => {
    await runCommand({
      command: command ?? "serve",
      path: path ?? ".",
      args,
      clean: options.clean,
    });
  })
  .parse(Deno.args);
```

**File: cli/lib/runner.ts**
```typescript
import { transpile, getOutputDir } from "@sprig/engine";
import { runWithCleanup } from "./cleanup.ts";
import { resolve } from "@std/path";

interface RunOptions {
  command: string;
  path: string;
  args: string[];
  clean?: boolean;
}

export async function runCommand(options: RunOptions): Promise<void> {
  const projectPath = resolve(options.path);

  await runWithCleanup(projectPath, async () => {
    // 1. Transpile
    await transpile(projectPath, {
      clean: options.clean,
    });

    // 2. Get output directory
    const outDir = getOutputDir(projectPath);

    // 3. Map sprig command to deno command
    const denoArgs = mapCommand(options.command, options.args);

    // 4. Execute deno with full passthrough
    const process = new Deno.Command("deno", {
      args: denoArgs,
      cwd: outDir,
      stdin: "inherit",
      stdout: "inherit",
      stderr: "inherit",
    });

    const status = await process.spawn().status;
    Deno.exit(status.code);
  });
}

function mapCommand(command: string, args: string[]): string[] {
  switch (command) {
    case "build":
      return ["task", "build", ...args];
    case "serve":
      return ["task", "dev", ...args];
    case "start":
      return ["task", "start", ...args];
    default:
      // Direct passthrough: sprig test → deno test
      return [command, ...args];
  }
}
```

### Phase 2: Cleanup Logic

**File: cli/lib/cleanup.ts**
```typescript
import {
  findWorkspaceDenoJson,
  removeWorkspaceMember,
  getOutputDir
} from "@sprig/engine";
import { relative, dirname } from "@std/path";

let currentProjectPath: string | null = null;
let workspaceJsonPath: string | null = null;
let relativeOutDir: string | null = null;

export async function runWithCleanup(
  projectPath: string,
  fn: () => Promise<void>
): Promise<void> {
  currentProjectPath = projectPath;

  // Setup cleanup handlers
  const cleanup = createCleanupHandler();
  Deno.addSignalListener("SIGINT", cleanup);
  Deno.addSignalListener("SIGTERM", cleanup);

  // Find workspace for cleanup tracking
  workspaceJsonPath = await findWorkspaceDenoJson(projectPath);
  if (workspaceJsonPath) {
    const workspaceRoot = dirname(workspaceJsonPath);
    const outDir = getOutputDir(projectPath);
    relativeOutDir = "./" + relative(workspaceRoot, outDir);
  }

  try {
    await fn();
  } finally {
    await performCleanup();
    Deno.removeSignalListener("SIGINT", cleanup);
    Deno.removeSignalListener("SIGTERM", cleanup);
  }
}

function createCleanupHandler(): () => void {
  return () => {
    performCleanup().then(() => Deno.exit(0));
  };
}

async function performCleanup(): Promise<void> {
  if (workspaceJsonPath && relativeOutDir) {
    try {
      await removeWorkspaceMember(workspaceJsonPath, relativeOutDir);
      console.log(`\nCleaned up: removed ${relativeOutDir} from workspace`);
    } catch {
      // Ignore cleanup errors
    }
  }
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

### Phase 4: Full Deno Passthrough

**Every** sprig command is a passthrough to deno. The CLI:
1. Intercepts the command name
2. Transpiles the project
3. Executes `deno <mapped-command> <all-remaining-args>` in `__sprig__/<proj>/`

**Command Mapping:**
| Sprig Command | Deno Command |
|---------------|--------------|
| `sprig serve` | `deno task dev` |
| `sprig build` | `deno task build` |
| `sprig start` | `deno task start` |
| `sprig test` | `deno test` |
| `sprig lint` | `deno lint` |
| `sprig fmt` | `deno fmt` |
| `sprig <any>` | `deno <any>` |

**All flags pass through:**
```bash
sprig serve --port=3000 --hostname=0.0.0.0
# → transpile → deno task dev --port=3000 --hostname=0.0.0.0

sprig test --coverage --parallel
# → transpile → deno test --coverage --parallel

sprig run scripts/seed.ts --allow-env
# → transpile → deno run scripts/seed.ts --allow-env
```

**Implementation:**
```typescript
// cli/lib/runner.ts
const process = new Deno.Command("deno", {
  args: denoArgs,        // Full passthrough
  cwd: outDir,           // Run in __sprig__/<proj>/
  stdin: "inherit",      // Passthrough stdin
  stdout: "inherit",     // Passthrough stdout
  stderr: "inherit",     // Passthrough stderr
});

// Exit with same code as deno
const status = await process.spawn().status;
Deno.exit(status.code);
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
# Serve (default command) - passes through to `deno task dev`
sprig
sprig serve
sprig serve ./my-app

# All flags pass through to deno
sprig serve --port=3000
sprig serve --hostname=0.0.0.0 --port=8080

# Build - passes through to `deno task build`
sprig build
sprig build ./my-app

# Start (production) - passes through to `deno task start`
sprig start

# Any deno command works - passes through directly
sprig test
sprig test --coverage
sprig lint
sprig fmt
sprig check
sprig run scripts/seed.ts

# Force clean rebuild before any command
sprig --clean serve
sprig --clean build

# Inspect/debug - flags pass through
sprig serve --inspect
sprig serve --inspect-brk

# Everything after the path passes to deno
sprig test ./my-app --parallel --coverage --fail-fast
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
