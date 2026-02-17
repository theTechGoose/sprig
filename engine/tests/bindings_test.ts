/**
 * Tests for property bindings ([prop], [class.x], [style.x], [(value)])
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";

// Helper to transform HTML to JSX and extract just the JSX string
function transform(html: string): string {
  const result = htmlToJsx(html, []);
  return result.jsx;
}

// =============================================================================
// Property Binding [prop]="expr" Tests
// =============================================================================

Deno.test("[disabled] binds property", () => {
  const input = `<button [disabled]="isLoading">Submit</button>`;
  const result = transform(input);
  assertEquals(result, `<button disabled={isLoading}>Submit</button>`);
});

Deno.test("[hidden] binds property", () => {
  const input = `<div [hidden]="isHidden">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div hidden={isHidden}>Content</div>`);
});

Deno.test("[value] binds input value", () => {
  const input = `<input [value]="name" />`;
  const result = transform(input);
  assertEquals(result, `<input value={name} />`);
});

Deno.test("multiple property bindings", () => {
  const input = `<input [value]="text" [disabled]="isDisabled" [placeholder]="hint" />`;
  const result = transform(input);
  assertEquals(result, `<input value={text} disabled={isDisabled} placeholder={hint} />`);
});

Deno.test("property binding with complex expression", () => {
  const input = `<div [title]="user.name + ' - ' + user.role">Info</div>`;
  const result = transform(input);
  assertEquals(result, `<div title={user.name + ' - ' + user.role}>Info</div>`);
});

Deno.test("property binding mixed with static attributes", () => {
  const input = `<input type="text" [value]="name" class="input-field" />`;
  const result = transform(input);
  // className is processed first (static class handling), then other attributes
  assertEquals(result, `<input className="input-field" type="text" value={name} />`);
});

// =============================================================================
// Class Binding [class.name]="cond" Tests
// =============================================================================

Deno.test("[class.active] binds conditional class", () => {
  const input = `<div [class.active]="isActive">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div className={(isActive ? "active" : "")}>Content</div>`);
});

Deno.test("[class.x] with boolean true", () => {
  const input = `<div [class.btn]="true">Button</div>`;
  const result = transform(input);
  assertEquals(result, `<div className="btn">Button</div>`);
});

Deno.test("multiple [class.x] bindings merge into single className", () => {
  const input = `<div [class.btn]="true" [class.primary]="isPrimary" [class.large]="isLarge">Click</div>`;
  const result = transform(input);
  assertEquals(result, `<div className={"btn" + (isPrimary ? " primary" : "") + (isLarge ? " large" : "")}>Click</div>`);
});

Deno.test("[class.x] combined with static class", () => {
  const input = `<div class="base" [class.active]="isActive">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div className={"base" + (isActive ? " active" : "")}>Content</div>`);
});

Deno.test("[class.x] with hyphenated class name", () => {
  const input = `<div [class.is-active]="active" [class.has-error]="error">Status</div>`;
  const result = transform(input);
  assertEquals(result, `<div className={(active ? "is-active" : "") + (error ? " has-error" : "")}>Status</div>`);
});

// =============================================================================
// Style Binding [style.prop]="value" Tests
// =============================================================================

Deno.test("[style.color] binds inline style", () => {
  const input = `<div [style.color]="textColor">Styled</div>`;
  const result = transform(input);
  assertEquals(result, `<div style={{color: textColor}}>Styled</div>`);
});

Deno.test("[style.fontSize] binds camelCase style", () => {
  const input = `<div [style.fontSize]="size">Text</div>`;
  const result = transform(input);
  assertEquals(result, `<div style={{fontSize: size}}>Text</div>`);
});

Deno.test("multiple [style.x] bindings merge into single style object", () => {
  const input = `<div [style.color]="c" [style.fontSize]="s" [style.backgroundColor]="bg">Styled</div>`;
  const result = transform(input);
  assertEquals(result, `<div style={{color: c, fontSize: s, backgroundColor: bg}}>Styled</div>`);
});

Deno.test("[style.x] with expression", () => {
  const input = `<div [style.width]="width + 'px'">Box</div>`;
  const result = transform(input);
  assertEquals(result, `<div style={{width: width + 'px'}}>Box</div>`);
});

Deno.test("[style.x] converts kebab-case to camelCase", () => {
  const input = `<div [style.background-color]="bg" [style.font-size]="fs">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div style={{backgroundColor: bg, fontSize: fs}}>Content</div>`);
});

// =============================================================================
// Attribute Binding [attr.x]="value" Tests
// =============================================================================

Deno.test("[attr.data-id] binds data attribute", () => {
  const input = `<div [attr.data-id]="itemId">Item</div>`;
  const result = transform(input);
  assertEquals(result, `<div data-id={itemId}>Item</div>`);
});

Deno.test("[attr.aria-label] binds aria attribute", () => {
  const input = `<button [attr.aria-label]="label">Click</button>`;
  const result = transform(input);
  assertEquals(result, `<button aria-label={label}>Click</button>`);
});

Deno.test("[attr.role] binds role attribute", () => {
  const input = `<div [attr.role]="role">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div role={role}>Content</div>`);
});

Deno.test("multiple [attr.x] bindings", () => {
  const input = `<div [attr.data-id]="id" [attr.data-name]="name" [attr.aria-hidden]="hidden">Content</div>`;
  const result = transform(input);
  assertEquals(result, `<div data-id={id} data-name={name} aria-hidden={hidden}>Content</div>`);
});

// =============================================================================
// Two-Way Binding [(prop)]="value" Tests
// =============================================================================

Deno.test("[(value)] expands to value and onInput", () => {
  const input = `<input [(value)]="username" />`;
  const result = transform(input);
  assertEquals(result, `<input value={username} onInput={(e) => username.value = e.target.value} />`);
});

Deno.test("[(checked)] expands to checked and onChange", () => {
  const input = `<input type="checkbox" [(checked)]="isChecked" />`;
  const result = transform(input);
  // Two-way bindings are processed before standard attributes
  assertEquals(result, `<input checked={isChecked} onChange={(e) => isChecked.value = e.target.checked} type="checkbox" />`);
});

Deno.test("[(value)] with select element", () => {
  const input = `<select [(value)]="selected"><option>A</option></select>`;
  const result = transform(input);
  assertEquals(result, `<select value={selected} onChange={(e) => selected.value = e.target.value}><option>A</option></select>`);
});

Deno.test("two-way binding with other attributes", () => {
  const input = `<input type="text" [(value)]="name" placeholder="Enter name" />`;
  const result = transform(input);
  // Two-way bindings are processed before standard attributes
  assertEquals(result, `<input value={name} onInput={(e) => name.value = e.target.value} type="text" placeholder="Enter name" />`);
});

// =============================================================================
// Combined Binding Tests
// =============================================================================

Deno.test("all binding types combined", () => {
  const input = `<input [disabled]="isLoading" [class.error]="hasError" [style.borderColor]="borderColor" [attr.data-field]="fieldName" [(value)]="text" />`;
  const result = transform(input);
  // Verify all bindings are present (order: className, style, two-way, other bindings)
  assertEquals(result.includes('className={(hasError ? "error" : "")}'), true);
  assertEquals(result.includes('style={{borderColor: borderColor}}'), true);
  assertEquals(result.includes('value={text}'), true);
  assertEquals(result.includes('onInput={(e) => text.value = e.target.value}'), true);
  assertEquals(result.includes('disabled={isLoading}'), true);
  assertEquals(result.includes('data-field={fieldName}'), true);
});

Deno.test("bindings with event handlers", () => {
  const input = `<button [disabled]="loading" (click)="handleClick()">Submit</button>`;
  const result = transform(input);
  // Verify both bindings are present
  assertEquals(result.includes('disabled={loading}'), true);
  assertEquals(result.includes('onClick={() => handleClick()}'), true);
  assertEquals(result.includes('>Submit</button>'), true);
});

Deno.test("bindings with interpolation in children", () => {
  const input = `<div [class.active]="isActive">{{message}}</div>`;
  const result = transform(input);
  assertEquals(result, `<div className={(isActive ? "active" : "")}>{message}</div>`);
});
