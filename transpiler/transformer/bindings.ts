/**
 * Transform Sprig template bindings to JSX
 */

/**
 * Transform interpolation: {{variable}} -> {variable}
 */
export function transformInterpolation(html: string): string {
  return html.replace(/\{\{([^}]+)\}\}/g, "{$1}");
}

/**
 * Transform event bindings: (click)="handler()" -> onClick={() => handler()}
 * Handles $event: (change)="handler($event)" -> onChange={(e) => handler(e)}
 * Returns the transformed HTML
 */
export function transformEventBindings(html: string): string {
  // Match (eventName)="handler(args)"
  const eventPattern = /\((\w+)\)="([^"]+)"/g;

  return html.replace(eventPattern, (_, eventName, handler) => {
    const jsxEvent = mapEventName(eventName);

    // Check if handler uses $event (Angular's event object)
    const usesEvent = handler.includes("$event");

    // If handler already has (), wrap in arrow function
    // Otherwise, just reference the function
    if (handler.includes("(")) {
      if (usesEvent) {
        // Replace $event with e and use (e) => ...
        const transformedHandler = handler.replace(/\$event/g, "e");
        return `${jsxEvent}={(e) => ${transformedHandler}}`;
      }
      return `${jsxEvent}={() => ${handler}}`;
    } else {
      return `${jsxEvent}={${handler}}`;
    }
  });
}

/**
 * Map Angular-style event names to React/Preact event names
 */
function mapEventName(eventName: string): string {
  const eventMap: Record<string, string> = {
    click: "onClick",
    dblclick: "onDblClick",
    mousedown: "onMouseDown",
    mouseup: "onMouseUp",
    mousemove: "onMouseMove",
    mouseenter: "onMouseEnter",
    mouseleave: "onMouseLeave",
    mouseover: "onMouseOver",
    mouseout: "onMouseOut",
    keydown: "onKeyDown",
    keyup: "onKeyUp",
    keypress: "onKeyPress",
    focus: "onFocus",
    blur: "onBlur",
    input: "onInput",
    change: "onChange",
    submit: "onSubmit",
    scroll: "onScroll",
    touchstart: "onTouchStart",
    touchend: "onTouchEnd",
    touchmove: "onTouchMove",
    drag: "onDrag",
    dragstart: "onDragStart",
    dragend: "onDragEnd",
    dragover: "onDragOver",
    dragenter: "onDragEnter",
    dragleave: "onDragLeave",
    drop: "onDrop",
    contextmenu: "onContextMenu",
    wheel: "onWheel",
    copy: "onCopy",
    cut: "onCut",
    paste: "onPaste",
  };

  return eventMap[eventName.toLowerCase()] || `on${capitalize(eventName)}`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Check if template has any bindings that require state
 * Includes: interpolation, event bindings, property bindings, two-way bindings
 */
export function hasBindings(html: string): boolean {
  return (
    /\{\{[^}]+\}\}/.test(html) ||          // Interpolation: {{var}}
    /\(\w+\)="[^"]+"/.test(html) ||         // Event binding: (click)="handler"
    /\[\w+[.\w]*\]="[^"]+"/.test(html) ||   // Property binding: [prop]="value"
    /\[\(\w+\)\]="[^"]+"/.test(html)        // Two-way binding: [(value)]="var"
  );
}

/**
 * Check if template has interactive bindings that require client-side JavaScript
 * Only includes: event bindings and two-way bindings
 * Property bindings and interpolation are allowed in server components (routes)
 */
export function hasInteractiveBindings(html: string): boolean {
  return (
    /\(\w+\)="[^"]+"/.test(html) ||         // Event binding: (click)="handler"
    /\[\(\w+\)\]="[^"]+"/.test(html)        // Two-way binding: [(value)]="var"
  );
}

/**
 * Extract all variable names used in interpolation
 */
export function extractInterpolatedVariables(html: string): string[] {
  const variables = new Set<string>();
  const pattern = /\{\{([^}]+)\}\}/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const expr = match[1].trim();
    // Extract variable name (first identifier)
    const varMatch = expr.match(/^(\w+)/);
    if (varMatch) {
      variables.add(varMatch[1]);
    }
  }

  return Array.from(variables);
}

/**
 * Extract all method names used in event bindings
 */
export function extractEventHandlers(html: string): string[] {
  const handlers = new Set<string>();
  const pattern = /\(\w+\)="([^"]+)"/g;

  let match;
  while ((match = pattern.exec(html)) !== null) {
    const handler = match[1].trim();
    // Extract method name (before parentheses)
    const methodMatch = handler.match(/^(\w+)/);
    if (methodMatch) {
      handlers.add(methodMatch[1]);
    }
  }

  return Array.from(handlers);
}

/**
 * Check if template requires island (client-side JS).
 *
 * Requires island:
 * - Event bindings: (click)="handler" - need JS event listeners
 * - Two-way bindings: [(value)]="var" - need JS for reactivity
 *
 * Does NOT require island (SSR works fine):
 * - Interpolation: {{value}} - server renders the value
 * - Property bindings: [prop]="expr" - server sets attributes
 */
export function requiresIsland(html: string): boolean {
  return (
    /\(\w+\)="[^"]+"/.test(html) ||         // Event binding: (click)="handler"
    /\[\(\w+\)\]="[^"]+"/.test(html)        // Two-way binding: [(value)]="var"
  );
}
