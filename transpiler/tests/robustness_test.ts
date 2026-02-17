/**
 * Robustness tests - edge cases, malformed input, stress tests
 */

import { assertEquals, assertExists } from "jsr:@std/assert";
import { htmlToJsx } from "../transformer/html-to-jsx.ts";
import { parseHtml } from "../parser/html.ts";
import { transformPipeExpression } from "../transformer/pipes.ts";

function transform(html: string): string {
  return htmlToJsx(html, []).jsx;
}

// =============================================================================
// Malformed HTML Tests
// =============================================================================

Deno.test("handles unclosed tags gracefully", () => {
  const input = `<div>content`;
  const result = transform(input);
  // Should not throw, treats as self-closing
  assertExists(result);
});

Deno.test("handles missing closing tag", () => {
  const input = `<div><span>nested</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles extra closing tags", () => {
  const input = `<div>content</div></div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles empty input", () => {
  const result = transform("");
  assertEquals(result, "");
});

Deno.test("handles whitespace only", () => {
  const result = transform("   \n\t  ");
  assertEquals(result, "");
});

Deno.test("handles deeply nested elements", () => {
  let html = "innermost";
  for (let i = 0; i < 50; i++) {
    html = `<div>${html}</div>`;
  }
  const result = transform(html);
  assertExists(result);
  assertEquals(result.includes("innermost"), true);
});

// =============================================================================
// Malformed Attributes Tests
// =============================================================================

Deno.test("handles attribute without value", () => {
  const input = `<input disabled />`;
  const result = transform(input);
  assertEquals(result.includes("disabled"), true);
});

Deno.test("handles attribute with empty value", () => {
  const input = `<div class="">content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles unclosed attribute quote", () => {
  // Parser should handle this gracefully
  const input = `<div class="unclosed>content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles mixed quote styles", () => {
  const input = `<div class="double" id='single'>content</div>`;
  const result = transform(input);
  assertEquals(result.includes('className="double"'), true);
  assertEquals(result.includes("id='single'") || result.includes('id="single"'), true);
});

// =============================================================================
// Malformed Directive Tests
// =============================================================================

Deno.test("handles *if with empty condition", () => {
  const input = `<div *if="">content</div>`;
  const result = transform(input);
  // Should handle empty condition
  assertExists(result);
});

Deno.test("handles *for with invalid syntax", () => {
  const input = `<div *for="invalid syntax here">content</div>`;
  const result = transform(input);
  // Should not crash, just output element
  assertExists(result);
});

Deno.test("handles *for without 'let' keyword", () => {
  const input = `<div *for="item of items">content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles *for without 'of' keyword", () => {
  const input = `<div *for="let item in items">content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles orphan *else without *if", () => {
  const input = `<div *else="Fallback">content</div>`;
  const result = transform(input);
  assertExists(result);
});

// =============================================================================
// Malformed Binding Tests
// =============================================================================

Deno.test("handles binding with empty expression", () => {
  const input = `<div [class.active]="">content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles malformed two-way binding", () => {
  const input = `<input [(value)]="" />`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles binding with special characters", () => {
  const input = `<div [title]="'Hello <world>'">content</div>`;
  const result = transform(input);
  assertExists(result);
});

// =============================================================================
// Malformed Pipe Tests
// =============================================================================

Deno.test("handles pipe with no name", () => {
  const result = transformPipeExpression("value |");
  assertExists(result);
});

Deno.test("handles multiple consecutive pipes", () => {
  const result = transformPipeExpression("value | | uppercase");
  assertExists(result);
});

Deno.test("handles pipe with unclosed quote in arg", () => {
  const result = transformPipeExpression("value | default:'unclosed");
  assertExists(result);
});

Deno.test("handles unknown pipe gracefully", () => {
  const result = transformPipeExpression("value | unknownPipe");
  // Should treat as custom pipe
  assertEquals(result, "unknownPipe(value)");
});

// =============================================================================
// Special Characters Tests
// =============================================================================

Deno.test("handles HTML entities in text", () => {
  const input = `<div>&lt;script&gt;alert('xss')&lt;/script&gt;</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles unicode in content", () => {
  const input = `<div>Hello 世界 🌍 مرحبا</div>`;
  const result = transform(input);
  assertEquals(result.includes("世界"), true);
  assertEquals(result.includes("🌍"), true);
});

Deno.test("handles unicode in attributes", () => {
  const input = `<div title="日本語" [attr.data-emoji]="'🎉'">content</div>`;
  const result = transform(input);
  assertEquals(result.includes("日本語"), true);
});

Deno.test("handles newlines in attribute values", () => {
  const input = `<div [title]="'line1\\nline2'">content</div>`;
  const result = transform(input);
  assertExists(result);
});

// =============================================================================
// Interpolation Edge Cases
// =============================================================================

Deno.test("handles nested braces in interpolation", () => {
  const input = `<div>{{obj.nested}}</div>`;
  const result = transform(input);
  assertEquals(result, `<div>{obj.nested}</div>`);
});

Deno.test("handles interpolation with object literal", () => {
  const input = `<div>{{ {a: 1, b: 2} }}</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles interpolation with ternary", () => {
  const input = `<div>{{condition ? 'yes' : 'no'}}</div>`;
  const result = transform(input);
  assertEquals(result, `<div>{condition ? 'yes' : 'no'}</div>`);
});

Deno.test("handles empty interpolation", () => {
  const input = `<div>{{}}</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles interpolation with pipe character in string", () => {
  const input = `<div>{{'a|b' | uppercase}}</div>`;
  const result = transform(input);
  assertExists(result);
});

// =============================================================================
// Self-closing Tag Edge Cases
// =============================================================================

Deno.test("handles void elements without explicit close", () => {
  const input = `<br><hr><img src="test.jpg">`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles custom self-closing components", () => {
  const input = `<my-component />`;
  const result = transform(input);
  assertEquals(result, `<MyComponent />`);
});

// =============================================================================
// Stress Tests
// =============================================================================

Deno.test("handles very long attribute value", () => {
  const longValue = "x".repeat(10000);
  const input = `<div title="${longValue}">content</div>`;
  const result = transform(input);
  assertExists(result);
  assertEquals(result.includes(longValue), true);
});

Deno.test("handles many attributes on single element", () => {
  let attrs = "";
  for (let i = 0; i < 100; i++) {
    attrs += ` data-attr-${i}="value${i}"`;
  }
  const input = `<div${attrs}>content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles many bindings on single element", () => {
  let bindings = "";
  for (let i = 0; i < 20; i++) {
    bindings += ` [class.c${i}]="cond${i}"`;
  }
  const input = `<div${bindings}>content</div>`;
  const result = transform(input);
  assertExists(result);
  // All classes should be merged
  assertEquals(result.includes("className="), true);
});

Deno.test("handles many sibling elements", () => {
  let html = "";
  for (let i = 0; i < 100; i++) {
    html += `<div>item ${i}</div>`;
  }
  const result = transform(html);
  assertExists(result);
  // Should wrap in fragment
  assertEquals(result.includes("<>"), true);
});

Deno.test("handles many chained pipes", () => {
  const result = transformPipeExpression("value | uppercase | lowercase | uppercase | lowercase | uppercase");
  assertEquals(result, "value.toUpperCase().toLowerCase().toUpperCase().toLowerCase().toUpperCase()");
});

// =============================================================================
// Combination Edge Cases
// =============================================================================

Deno.test("handles directive with all binding types", () => {
  const input = `
    <div *if="show"
         *for="let item of items"
         [disabled]="isDisabled"
         [class.active]="isActive"
         [style.color]="color"
         [attr.data-id]="id"
         [(value)]="val"
         (click)="handle()">
      {{item | uppercase}}
    </div>
  `;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles multiple *if in same parent", () => {
  const input = `
    <div>
      <span *if="a">A</span>
      <span *if="b">B</span>
      <span *if="c">C</span>
    </div>
  `;
  const result = transform(input);
  assertExists(result);
  // Should have three conditional renders (count && occurrences)
  assertEquals((result.match(/&&/g) || []).length, 3);
});

Deno.test("handles complex nested *for", () => {
  const input = `
    <div *for="let group of groups; trackBy: group.id">
      <ul>
        <li *for="let item of group.items; index as i; trackBy: item.id">
          {{i}}: {{item.name}}
        </li>
      </ul>
    </div>
  `;
  const result = transform(input);
  assertExists(result);
  // Should have two map calls
  assertEquals((result.match(/\.map\(/g) || []).length, 2);
});

// =============================================================================
// Recovery Tests
// =============================================================================

Deno.test("recovers from partially valid template", () => {
  const input = `
    <div>Valid content</div>
    <broken
    <div>More valid content</div>
  `;
  const result = transform(input);
  assertExists(result);
  assertEquals(result.includes("Valid content"), true);
});

Deno.test("handles comment-like content", () => {
  const input = `<div>before <!-- comment --> after</div>`;
  const result = transform(input);
  assertExists(result);
});

// =============================================================================
// Type Coercion Tests
// =============================================================================

Deno.test("handles numeric attribute values", () => {
  const input = `<div tabindex="0" [maxlength]="100">content</div>`;
  const result = transform(input);
  assertExists(result);
});

Deno.test("handles boolean attribute values", () => {
  const input = `<input [disabled]="true" [readonly]="false" />`;
  const result = transform(input);
  assertExists(result);
});
