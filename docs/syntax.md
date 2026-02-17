# Sprig Syntax Reference

## @sprig/kit

Import decorators from `@sprig/kit` for full LSP support:

```typescript
import { Component, Input, Service } from "@sprig/kit";
```

## Components

```typescript
// mod.ts
import { Component, Input } from "@sprig/kit";

@Component({
  template: "./mod.html",
  island: true, // Client-side island (auto-detected if undefined)
})
export class MyComponent {
  // Properties become signals in islands
  count = 0;
  items = ["a", "b", "c"];

  // Methods are preserved
  increment() {
    this.count++;
  }
}
```

### Island Auto-Detection

Components are automatically marked as islands when they:

- Use event bindings `(click)="..."`
- Use two-way bindings `[(value)]="..."`
- Have methods that modify state

### HTML-Only Components

Components without logic can be HTML-only (no `mod.ts` required):

```
src/home/domain/business/hero-section/
└── mod.html    # Props inferred from {{propName}} interpolations
```

## Services

Use `@Service()` for injectable services with side effects:

```typescript
import { Service } from "@sprig/kit";

@Service()
export class TranslationsService {
  lang = "en";
  translations = {};

  setLang(lang: string) {
    this.lang = lang;
  }
}
```

### Service Options

```typescript
@Service({
  scope: "singleton",     // "singleton" (default) or "transient"
  onStartup: ["init"],    // Methods to call when DI initializes
})
export class DataService {
  data = [];

  async init() {
    this.data = await fetch("/api/data").then(r => r.json());
  }
}
```

### onStartup

Methods listed in `onStartup` are called when the DI container initializes. The generated `container.ts` exports an `initializeServices()` function:

```typescript
// Generated container.ts
export async function initializeServices() {
  const dataService = container.resolve(DataService);
  await dataService.init();
}
```

Call this during app startup to initialize services.

## Input Props

Use `@Input()` to declare component props with full TypeScript support.

```typescript
import { Component, Input } from "@sprig/kit";

@Component({ template: "./mod.html" })
export class UserCard {
  // Basic input
  @Input() name: string;

  // With default value
  @Input() age: number = 25;

  // Required input
  @Input({ required: true }) id: string;

  // With alias (external name differs from internal)
  @Input({ alias: "userName" }) internalName: string;

  // Optional input (with ?)
  @Input() avatar?: string;
}
```

Usage:

```html
<UserCard id="123" name="Alice" userName="alice_dev" />
```

### Dev Props (`mod.json`)

Create a `mod.json` alongside your component to define development props for the `--dev` routes.

```json
{
  "props": {
    "name": "Test User",
    "age": 30,
    "id": "dev-123"
  }
}
```

## Structural Directives

### \*if

```html
<div *if="condition">Shown when true</div>

<!-- With else -->
<div *if="condition" *else="FallbackComponent">Shown when true</div>
```

### \*for

```html
<!-- Basic loop -->
<li *for="let item of items">{{item}}</li>

<!-- With index (two syntaxes supported) -->
<li *for="let item of items; index as i">{{i}}: {{item}}</li>
<li *for="let item of items; let i = index">{{i}}: {{item}}</li>

<!-- With trackBy (for performance) -->
<li *for="let item of items; trackBy: item.id">{{item.name}}</li>

<!-- Combined -->
<li *for="let item of items; index as i; trackBy: item.id">
  {{i}}: {{item.name}}
</li>
```

## Bindings

### Property Binding

```html
<input [value]="name" />
<img [src]="imageUrl" />
<button [disabled]="isLoading" />
```

### Class Binding

```html
<!-- Single class -->
<div [class.active]="isActive">
  <!-- Multiple classes -->
  <div [class.active]="isActive" [class.disabled]="isDisabled"></div>
</div>
```

### Style Binding

```html
<!-- Direct value -->
<div [style.color]="textColor">
  <div [style.opacity]="opacity">
    <!-- With unit suffix (auto-appended) -->
    <div [style.width.px]="width">
      <div [style.margin-top.rem]="spacing">
        <div [style.rotation.deg]="angle"></div>
      </div>
    </div>
  </div>
</div>
```

**Supported units:** px, em, rem, %, vh, vw, vmin, vmax, s, ms, deg, rad, turn

### Attribute Binding

```html
<div [attr.data-id]="itemId">
  <a [attr.aria-label]="label"></a>
</div>
```

### Event Binding

```html
<button (click)="handleClick()">
  <input (input)="onInput($event)" />
  <form (submit)="onSubmit($event)">
    <!-- Event with method reference (no parens) -->
    <button (click)="handleClick"></button>
  </form>
</button>
```

**Supported events:**

| Category | Events                                                                                      |
| -------- | ------------------------------------------------------------------------------------------- |
| Mouse    | click, dblclick, mousedown, mouseup, mousemove, mouseenter, mouseleave, mouseover, mouseout |
| Keyboard | keydown, keyup, keypress                                                                    |
| Form     | input, change, submit, focus, blur                                                          |
| Touch    | touchstart, touchend, touchmove                                                             |
| Drag     | drag, dragstart, dragend, dragover, dragenter, dragleave, drop                              |
| Other    | scroll, contextmenu, wheel, copy, cut, paste                                                |

Any event not in this list falls back to `on{EventName}` pattern.

### Two-Way Binding

```html
<input [(value)]="name" />
```

Expands to:

```html
<input value={name} onInput={(e) => name = e.target.value} />
```

## Interpolation

```html
<span>Hello, {{name}}!</span>
<span>Total: {{items.length}}</span>
<span>{{user.firstName}} {{user.lastName}}</span>
```

## Pipes

### Built-in Pipes

```html
{{name | uppercase}} {{name | lowercase}} {{name | titlecase}} {{data | json}}
{{items | slice:0:5}} {{price | currency}} {{price | currency:'EUR'}} {{date |
date}} {{date | date:'short'}} {{value | number}} {{value | percent}} {{value |
default:'N/A'}} {{userData | async}}
```

### Async Pipe

Unwraps promises reactively. When the promise resolves, the view updates automatically.

```typescript
// mod.ts
@Component({ template: "./mod.html" })
export class UserProfile {
  userData = fetch("/api/user").then((r) => r.json());
}
```

```html
<!-- mod.html -->
<div *if="userData | async">
  <h1>{{(userData | async).name}}</h1>
</div>
```

### Custom Pipes

```typescript
// pipes/pluralize.pipe.ts
import { Pipe } from "@sprig/kit";

@Pipe({ name: 'pluralize' })
export function pluralize(value: number, singular: string, plural?: string): string {
  const p = plural || singular + 's';
  return value === 1 ? `${value} ${singular}` : `${value} ${p}`;
}
```

```html
{{count | pluralize:'item'}} {{count | pluralize:'child':'children'}}
```

## Slots

### Default Slot

```html
<!-- parent-component.html -->
<div class="card">
  <slot />
</div>

<!-- usage -->
<ParentComponent>
  <p>This goes in the slot</p>
</ParentComponent>
```

### Named Slots

```html
<!-- card.html -->
<div class="card">
  <header><slot name="header" /></header>
  <main><slot /></main>
  <footer><slot name="footer" /></footer>
</div>

<!-- usage -->
<Card header={<h1>Title</h1>} footer={<button>OK</button>}>
  <p>Body content</p>
</Card>
```

## Bootstrap Layout

The `bootstrap.html` file is the root layout that wraps all routes:

```html
<!-- src/bootstrap.html -->
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
  <link rel="stylesheet" href="/styles.css" />
</head>
<body>
  <Nav />
  <main>
    <slot />  <!-- Route content renders here -->
  </main>
  <Footer />
</body>
</html>
```

## Template References

```html
<input #nameInput type="text" />
<button (click)="focusInput(nameInput)">Focus</button>
```

## Custom Directives

```typescript
// directives/tooltip.directive.ts
import { Directive } from "@sprig/kit";

@Directive({ selector: '[tooltip]' })
export function tooltip(element: Element, value: string): void {
  element.setAttribute('title', value);
}
```

```html
<span *tooltip="'Help text'">Hover me</span>
```
