# CLI Reference

## Usage

```bash
deno run -A transpiler/mod.ts <sprig-app-path> [flags]
```

## Flags

| Flag | Description |
|------|-------------|
| `--dev` | Generate dev routes at `/_dev/*` for component testing |
| `--watch` | Incremental build - preserves boilerplate, only updates source |
| `--clean` | Force clean rebuild (removes entire dist folder) |
| `--prod` | Copy all static assets (default: symlink non-CSS for faster dev) |

## Examples

```bash
# Basic transpile
deno run -A transpiler/mod.ts ./fixtures/landing

# Development with component testing routes
deno run -A transpiler/mod.ts ./fixtures/landing --dev

# Incremental build for HMR
deno run -A transpiler/mod.ts ./fixtures/landing --watch

# Production build
deno run -A transpiler/mod.ts ./fixtures/landing --prod --clean
```

## Static Assets

The transpiler copies files from `src/static/` to the output root.

### Dev Mode (default)

- **CSS files**: Copied (required for `@import "tailwindcss"` resolution)
- **Other files**: Symlinked for instant updates

### Prod Mode (`--prod`)

- **All files**: Copied (symlinks don't work in deployments)

## Output Structure

```
<app>-dist/
├── deno.json          # Fresh config with merged imports
├── client.ts          # Client entry (CSS import)
├── main.ts            # Server entry
├── vite.config.ts     # Vite config
├── utils.ts           # Fresh utilities
├── styles.css         # From src/static/
├── components/        # Server components
├── islands/           # Client islands
├── routes/
│   ├── _layout.tsx    # Generated from bootstrap.html
│   └── ...            # Route components
├── services/
│   ├── container.ts   # DI container with initializeServices()
│   └── *.ts           # Service classes
├── directives/        # Custom directives (if any)
└── pipes/             # Custom pipes (if any)
```

## Workspace Integration

The transpiler automatically:

1. Detects if project is in a Deno workspace
2. Adds `<app>-dist` to workspace members
3. Removes stale `-dist` folders from workspace on cleanup
4. Removes workspace member on `SIGINT` (Ctrl+C)

## Dev Routes (`--dev`)

Generates routes at `/_dev/` for isolated component testing (similar to Storybook).

### Routes Generated

- `/_dev/` - Index of all components with links and metadata
- `/_dev/<component-slug>` - Individual component preview (e.g., `/_dev/user-card`)

### Features

- **Auto-generated props**: Uses `@Input()` decorators to create default props
- **Custom dev props**: Create a `mod.json` alongside your component:

```json
{
  "props": {
    "name": "Test User",
    "isActive": true,
    "items": ["a", "b", "c"]
  }
}
```

- **Props inspector**: Each dev route shows the props being passed
- **Island indicator**: Index shows which components are client-side islands

### Example

```
src/home/domain/business/user-card/
├── mod.ts       # @Component with @Input() decorators
├── mod.html     # Template
└── mod.json     # Optional dev props
```

Dev route generated at: `/_dev/user-card`
