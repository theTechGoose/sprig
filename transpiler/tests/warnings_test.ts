/**
 * Warning system tests
 */

import { assertEquals } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";
import { WarningCodes } from "../utils/warnings.ts";

function transform(html: string) {
  return htmlToJsx(html, []);
}

// =============================================================================
// *for Directive Warning Tests
// =============================================================================

Deno.test("warns for empty *for expression", () => {
  const result = transform(`<div *for="">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_FOR_EXPRESSION);
});

Deno.test("warns for *for missing 'let' keyword", () => {
  const result = transform(`<div *for="item of items">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_FOR_SYNTAX);
  assertEquals(result.warnings?.[0].message.includes("missing 'let'"), true);
});

Deno.test("warns for *for using 'in' instead of 'of'", () => {
  const result = transform(`<div *for="let item in items">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_FOR_SYNTAX);
  assertEquals(result.warnings?.[0].message.includes("'in' instead of 'of'"), true);
});

Deno.test("warns for *for missing 'of' clause", () => {
  const result = transform(`<div *for="let item">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_FOR_SYNTAX);
  assertEquals(result.warnings?.[0].message.includes("missing 'of' clause"), true);
});

Deno.test("warns for *for with invalid syntax", () => {
  const result = transform(`<div *for="some random text">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_FOR_SYNTAX);
});

Deno.test("warns for *for with unknown clause", () => {
  const result = transform(`<div *for="let item of items; unknown: stuff">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_FOR_SYNTAX);
  assertEquals(result.warnings?.[0].message.includes("unknown clause"), true);
});

// =============================================================================
// *if Directive Warning Tests
// =============================================================================

Deno.test("warns for empty *if condition", () => {
  const result = transform(`<div *if="">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_IF_CONDITION);
});

Deno.test("warns for *if with whitespace-only condition", () => {
  const result = transform(`<div *if="   ">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_IF_CONDITION);
});

Deno.test("warns for orphan *else without *if", () => {
  const result = transform(`<div *else="Fallback">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.ORPHAN_ELSE);
});

Deno.test("no warning for valid *if with *else", () => {
  const result = transform(`<div *if="condition" *else="Fallback">content</div>`);
  assertEquals(result.warnings, undefined);
});

// =============================================================================
// Binding Warning Tests
// =============================================================================

Deno.test("warns for empty property binding", () => {
  const result = transform(`<div [disabled]="">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_BINDING_EXPRESSION);
});

Deno.test("warns for empty class binding", () => {
  const result = transform(`<div [class.active]="">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_BINDING_EXPRESSION);
});

Deno.test("warns for empty style binding", () => {
  const result = transform(`<div [style.color]="">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.EMPTY_BINDING_EXPRESSION);
});

Deno.test("warns for empty two-way binding", () => {
  const result = transform(`<input [(value)]="" />`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.INVALID_TWO_WAY_BINDING);
});

// =============================================================================
// Dangerous Binding Warning Tests
// =============================================================================

Deno.test("warns for [innerHTML] binding", () => {
  const result = transform(`<div [innerHTML]="content">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.DANGEROUS_BINDING);
  assertEquals(result.warnings?.[0].message.includes("XSS"), true);
});

Deno.test("warns for [outerHTML] binding", () => {
  const result = transform(`<div [outerHTML]="content">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.DANGEROUS_BINDING);
});

Deno.test("warns for [dangerouslySetInnerHTML] binding", () => {
  const result = transform(`<div [dangerouslySetInnerHTML]="content">content</div>`);
  assertEquals(result.warnings?.length, 1);
  assertEquals(result.warnings?.[0].code, WarningCodes.DANGEROUS_BINDING);
});

// =============================================================================
// Multiple Warnings Tests
// =============================================================================

Deno.test("collects multiple warnings from same element", () => {
  const result = transform(`<div *for="" [innerHTML]="">content</div>`);
  assertEquals(result.warnings?.length, 3); // empty *for, dangerous binding, empty binding
});

Deno.test("collects warnings from nested elements", () => {
  const result = transform(`
    <div *if="">
      <span *for="">text</span>
    </div>
  `);
  assertEquals(result.warnings?.length, 2); // empty *if, empty *for
});

// =============================================================================
// Valid Templates (no warnings)
// =============================================================================

Deno.test("no warnings for valid *for directive", () => {
  const result = transform(`<li *for="let item of items">{{item}}</li>`);
  assertEquals(result.warnings, undefined);
});

Deno.test("no warnings for valid *for with all options", () => {
  const result = transform(`<li *for="let item of items; index as i; trackBy: item.id">{{i}}: {{item}}</li>`);
  assertEquals(result.warnings, undefined);
});

Deno.test("no warnings for valid *if directive", () => {
  const result = transform(`<div *if="isVisible">content</div>`);
  assertEquals(result.warnings, undefined);
});

Deno.test("no warnings for valid bindings", () => {
  const result = transform(`
    <div [disabled]="isDisabled"
         [class.active]="isActive"
         [style.color]="textColor"
         (click)="handleClick()">
      content
    </div>
  `);
  assertEquals(result.warnings, undefined);
});

Deno.test("no warnings for valid two-way binding", () => {
  const result = transform(`<input [(value)]="username" />`);
  assertEquals(result.warnings, undefined);
});

// =============================================================================
// Warning Level Tests
// =============================================================================

Deno.test("syntax errors have 'warning' level", () => {
  const result = transform(`<div *for="">content</div>`);
  assertEquals(result.warnings?.[0].level, "warning");
});

Deno.test("dangerous bindings have 'warning' level", () => {
  const result = transform(`<div [innerHTML]="content">content</div>`);
  assertEquals(result.warnings?.[0].level, "warning");
});
