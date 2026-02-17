/**
 * Test: *for directive with event bindings
 * Bug: Event bindings inside *for loops generate malformed JSX
 *
 * Input:  <th *for="col of columns" (click)="toggleSort(col.key)">{{ col.label }}</th>
 * Bad:    onClick={() = key={__idx__}> toggleSort(col.key)}
 * Good:   onClick={() => toggleSort(col.key)} key={__idx__}
 */

import { assertEquals, assertStringIncludes } from "jsr:@std/assert";
import { htmlToJsx } from "../html-to-jsx.ts";

Deno.test("*for with event binding generates valid JSX", () => {
  const template = `<th *for="col of columns" (click)="toggleSort(col.key)">{{ col.label }}</th>`;

  const result = htmlToJsx(template, []);

  // Should generate valid arrow function syntax
  assertStringIncludes(result.jsx, "() =>");

  // Should NOT have malformed "() =" without the ">"
  assertEquals(result.jsx.includes("() = "), false, "Should not have malformed arrow function '() = '");

  // The onClick and key should be separate attributes
  assertStringIncludes(result.jsx, "onClick={");
  assertStringIncludes(result.jsx, "key={");

  // Key should come after the onClick handler, not inside it
  const onClickIdx = result.jsx.indexOf("onClick={");
  const keyIdx = result.jsx.indexOf("key={");
  assertEquals(onClickIdx < keyIdx, true, "onClick should come before key attribute");
});

Deno.test("*for with multiple bindings generates valid JSX", () => {
  const template = `<th *for="col of columns" [class]="getClasses(col)" (click)="handleClick(col)">{{ col.label }}</th>`;

  const result = htmlToJsx(template, []);

  // Should have valid className binding
  assertStringIncludes(result.jsx, "className={");

  // Should have valid onClick handler
  assertStringIncludes(result.jsx, "onClick={() => handleClick(col)}");

  // Should have key attribute
  assertStringIncludes(result.jsx, "key={");
});

Deno.test("*for generates .map() with arrow function", () => {
  const template = `<li *for="item of items">{{ item.name }}</li>`;

  const result = htmlToJsx(template, []);

  // Should generate .map() call
  assertStringIncludes(result.jsx, "items.map(");

  // Should have arrow function in map
  assertStringIncludes(result.jsx, "=>");
});
