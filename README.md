# Sprig

Angular-like templates that transpile to Deno Fresh.

## Quick Start

```bash
./scripts/test.sh landing
```

## Project Structure

```
sprig/
├── kit/               # @sprig/kit - Decorators for LSP support
├── transpiler/        # The transpiler
├── fixtures/          # Test projects
│   └── landing/
├── scripts/
│   └── test.sh
└── docs/              # Documentation
```

## App Structure

Sprig uses a modular domain-driven architecture:

```
src/
├── bootstrap.html          # Root layout (always server-rendered)
├── _dto/                   # Shared data transfer objects
│
└── [module]/               # Feature modules (e.g., "home", "auth", "dashboard")
    ├── domain/
    │   ├── business/       # UI components
    │   ├── data/           # Services (side effects)
    │   └── coordinators/   # Wire data → business
    │
    └── routes/             # Page entry points (organizational only)
        ├── index/          # → / (if module is "home")
        └── about/          # → /about (if module is "home")
```

### Module Naming

- **`home`** module routes map to root (`/`, `/about`, etc.)
- Other modules keep their name in the URL (`/dashboard`, `/dashboard/settings`)

## @sprig/kit

Import decorators for full LSP support (autocomplete, type-checking, go-to-definition):

```typescript
import { Component, Input, Service } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true,
})
export class CounterComponent {
  @Input() initialCount: number = 0;
  count = 0;

  increment() {
    this.count++;
  }
}
```

## Documentation

- [Syntax Reference](docs/syntax.md) - Templates, directives, bindings, pipes
- [CLI Reference](docs/cli.md) - Transpiler flags and options
- [Architecture](docs/architecture.md) - How the transpiler works
