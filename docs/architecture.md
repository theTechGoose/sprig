# Architecture

## Overview

```
Source (Sprig)                    Transpiler              Output (Fresh)
──────────────────────           ──────────────          ─────────────────
src/
├── bootstrap.html        ──────►  Parser      ──────►   routes/_layout.tsx
├── _dto/                          Transformer
│                                  Generator
└── [module]/
    ├── domain/
    │   ├── business/     ──────►              ──────►   components/ & islands/
    │   ├── data/         ──────►              ──────►   services/
    │   └── coordinators/ ──────►              ──────►   components/
    │
    ├── routes/
    │   ├── index/        ──────►              ──────►   routes/index.tsx (if "home")
    │   └── about/        ──────►              ──────►   routes/about.tsx (if "home")
    ├── directives/       ──────►              ──────►   directives/
    └── pipes/            ──────►              ──────►   pipes/
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
    │   ├── business/       # UI components (can be islands)
    │   ├── data/           # Services with side effects
    │   └── coordinators/   # Wire data services to business components
    │
    └── routes/             # Page entry points (organizational only)
        ├── index/          # → routes/index.tsx (/) if module is "home"
        └── about/          # → routes/about.tsx (/about) if module is "home"
```

Note: The `routes/` folder in source is organizational only and stripped during
transpilation.

### Module Naming Convention

| Module Name | Route Path | URL |
|-------------|------------|-----|
| `home` | `routes/index.tsx` | `/` |
| `home` | `routes/about.tsx` | `/about` |
| `dashboard` | `routes/dashboard/index.tsx` | `/dashboard` |
| `dashboard` | `routes/dashboard/settings.tsx` | `/dashboard/settings` |

The **`home`** module is special: its routes map to the root URL path. All other modules preserve their name in the URL.

### Domain Layers

- **business/** - UI components. Pure presentation logic. Can be islands if they need client-side interactivity.
- **data/** - Services that handle side effects (API calls, storage, etc.). Use `@Service()` decorator.
- **coordinators/** - Server-rendered components that wire data services to business components. They fetch data and pass it down as props.

### bootstrap.html

The root layout that wraps all routes. Always server-rendered.

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <slot />  <!-- Route content renders here -->
</body>
</html>
```

## Pipeline

### 1. Scanner (`parser/scanner.ts`)

Walks the source directory and categorizes files:
- Bootstrap layout (`bootstrap.html`)
- Modules (top-level directories)
- Routes (`[module]/routes/` - stripped during transpilation)
- Business components (`[module]/domain/business/`)
- Data services (`[module]/domain/data/`)
- Coordinators (`[module]/domain/coordinators/`)
- Directives (`*.directive.ts`)
- Pipes (`*.pipe.ts`)

### 2. Parser (`parser/`)

#### Component Parser (`component.ts`)
- Extracts `@Component` decorator metadata
- Parses TypeScript class for properties and methods
- Determines if component should be an island

#### Service Parser (`service.ts`)
- Extracts `@Service` decorator metadata
- Parses `onStartup` methods for DI initialization
- Parses class properties and methods

#### Input Parser (`input.ts`)
- Parses `@Input()` decorators
- Extracts prop types, defaults, required flags, aliases
- Generates TypeScript interfaces for props

#### HTML Parser (`html.ts`)
- Tokenizes HTML templates
- Handles self-closing tags, comments
- Extracts directives (`*if`, `*for`) and bindings
- Parses template refs (`#refName`)

### 3. Transformer (`transformer/`)

#### HTML to JSX (`html-to-jsx.ts`)
- Converts HTML elements to JSX
- Transforms `class` → `className`
- Handles void elements

#### Directives (`directives.ts`)
- `*if` → ternary expression
- `*for` → `.map()` with key generation
- `*else` → fallback component

#### Bindings (`bindings.ts`)
- `{{expr}}` → `{expr}`
- `[prop]="expr"` → `prop={expr}`
- `[attr.x]="expr"` → `x={expr}` (attribute binding)
- `[class.x]="cond"` → className logic
- `[style.x]="val"` → style object with camelCase
- `[style.x.px]="val"` → style with unit suffix
- `(event)="handler()"` → `onEvent={() => handler()}`
- `[(prop)]="val"` → two-way binding
- `#refName` → `ref={refName}` (template reference)

#### Pipes (`pipes.ts`)
- `{{val | pipe:arg}}` → `pipe(val, arg)`
- Built-in: uppercase, lowercase, json, slice, currency, date, etc.

#### Slots (`slot.ts`)
- In bootstrap.html: `<slot />` → `<Component />` (Fresh route content)
- In components: `<slot />` → `{children}` (passed children)
- Named slots: `<slot name="x" />` → `{x}` (named prop)

### 4. Generator (`generator/`)

#### Boilerplate (`boilerplate.ts`)
- `deno.json` with merged imports
- `client.ts`, `main.ts`, `vite.config.ts`

#### Components (`components.ts`)
- Generates `.tsx` files
- Server components or islands based on metadata

#### Routes (`routes.ts`)
- Maps route structure to Fresh routes
- Handles dynamic routes `[slug]`

#### Services (`services.ts`)
- Generates service classes with tsyringe DI
- Converts properties to Preact signals
- Generates `container.ts` with `initializeServices()` for startup hooks

#### Dev Routes (`dev-routes.ts`)
- Generates `/_dev/` index with component listing
- Individual component preview routes
- Reads `mod.json` for custom dev props
- Auto-generates props from `@Input()` metadata

#### Static Assets (`static-assets.ts`)
- Dev mode: symlinks non-CSS files, copies CSS
- Prod mode: copies all files
- CSS always copied for `@import "tailwindcss"` resolution

## Island Detection

Components become islands when they have:

1. **Explicit**: `island: true` in decorator
2. **Event bindings**: `(click)="..."` etc.
3. **Two-way bindings**: `[(value)]="..."`
4. **Methods**: Functions that likely modify state

Server components (non-islands):
- Pure display components
- No interactivity
- SSR only, no hydration

## Key Transforms

### Class to Signal

```typescript
// Input
class Counter {
  count = 0;
}

// Output (island)
function Counter() {
  const count = useSignal(0);
  return <div>{count.value}</div>;
}
```

### *for to map

```html
<!-- Input -->
<li *for="let item of items; let i = index">{{item}}</li>

<!-- Output -->
{items.map((item, i) => <li key={i}>{item}</li>)}
```

### Event Binding

```html
<!-- Input -->
<button (click)="increment()">

<!-- Output -->
<button onClick={() => increment()}>
```

### Service to DI Container

```typescript
// Input
@Service({ onStartup: ["init"] })
export class DataService {
  data = [];
  async init() {
    this.data = await fetch("/api/data").then(r => r.json());
  }
}

// Output
@singleton()
@injectable()
export class DataService {
  data = signal([]);
  async init() {
    this.data.value = await fetch("/api/data").then(r => r.json());
  }
}

// container.ts
export async function initializeServices() {
  const dataService = container.resolve(DataService);
  await dataService.init();
}
```
